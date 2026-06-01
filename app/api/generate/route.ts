/**
 * /api/generate
 *
 * 受信メール本文 + ユーザー文体プロフィールを受け取り、
 * Claude API で案A（カジュアル）/ 案B（丁寧）を生成する。
 *
 * - サーバー側でのみ ANTHROPIC_API_KEY を使う（クライアントには漏らさない）
 * - 受信メール本文は DB に保存しない（生成処理に使うのみ）
 * - 入力 3,000文字 を超えると 400 を返す（L-3）
 * - Firebase ID token を検証し、無料プランは JST 1日5通までに制限する（M-1）
 * - JSON パース失敗時は1回リトライ
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage } from "@/lib/system-prompt";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_PROFILE,
  GenerateRequest,
  GenerateResponse,
  MAX_BODY_LENGTH,
  UsageStatus,
  UserProfile,
} from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 2048;
const FREE_DAILY_LIMIT = 5;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

class UsageLimitExceededError extends Error {
  constructor(
    readonly usage: UsageStatus,
  ) {
    super("FREE_DAILY_LIMIT_EXCEEDED");
  }
}

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function getJstDateKey(now = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function normalizePlan(value: unknown): UserProfile["plan"] {
  return value === "paid" ? "paid" : "free";
}

async function loadServerPlan(uid: string): Promise<UserProfile["plan"]> {
  const snap = await adminDb.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new Error("プロフィールが未作成です");
  }
  return normalizePlan(snap.data()?.plan);
}

async function reserveUsage(uid: string, plan: UserProfile["plan"]): Promise<UsageStatus> {
  const date = getJstDateKey();
  if (plan === "paid") {
    return { plan, date, used: null, limit: null, remaining: null };
  }

  const usageRef = adminDb.doc(`users/${uid}/usage/${date}`);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const current = snap.exists && typeof snap.data()?.count === "number" ? snap.data()!.count : 0;

    if (current >= FREE_DAILY_LIMIT) {
      throw new UsageLimitExceededError({
        plan,
        date,
        used: current,
        limit: FREE_DAILY_LIMIT,
        remaining: 0,
      });
    }

    const next = current + 1;
    tx.set(
      usageRef,
      {
        count: next,
        date,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!snap.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );

    return {
      plan,
      date,
      used: next,
      limit: FREE_DAILY_LIMIT,
      remaining: Math.max(FREE_DAILY_LIMIT - next, 0),
    };
  });
}

export async function POST(req: NextRequest) {
  // ---- 認証 ----
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "ログイン情報を確認できませんでした" }, { status: 401 });
  }

  // ---- 入力バリデーション ----
  let payload: GenerateRequest;
  try {
    payload = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || typeof payload.body !== "string" || payload.body.trim().length === 0) {
    return NextResponse.json({ error: "body は必須です" }, { status: 400 });
  }

  if (payload.body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `受信メール本文は ${MAX_BODY_LENGTH} 文字以内にしてください（現在 ${payload.body.length} 文字）` },
      { status: 400 },
    );
  }

  if (!payload.profile) {
    return NextResponse.json({ error: "profile は必須です" }, { status: 400 });
  }

  // ---- API キー確認 ----
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  // ---- 利用制限 ----
  let usage: UsageStatus;
  let plan: UserProfile["plan"];
  try {
    plan = await loadServerPlan(uid);
    usage = await reserveUsage(uid, plan);
  } catch (err) {
    if (err instanceof UsageLimitExceededError) {
      return NextResponse.json(
        {
          error: "無料プランの本日分（5通）を使い切りました。有料プランでは無制限に利用できます。",
          usage: err.usage,
        },
        { status: 429 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const client = new Anthropic({ apiKey });
  const profile: UserProfile = { ...DEFAULT_PROFILE, ...payload.profile, plan };
  const systemPrompt = buildSystemPrompt(profile, payload.styleSamples ?? []);
  const userMessage = buildUserMessage({ ...payload, profile });

  // ---- Claude 呼び出し + JSONパース（失敗時1回リトライ） ----
  const callClaude = async () => {
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = res.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude応答にテキストブロックが含まれていません");
    }
    return textBlock.text;
  };

  const parseResponse = (raw: string): GenerateResponse => {
    // JSONの周辺にゴミがある場合に備えて { ... } を抽出
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw;
    const parsed = JSON.parse(jsonStr) as GenerateResponse;
    if (typeof parsed.casual !== "string" || typeof parsed.polished !== "string") {
      throw new Error("casual / polished フィールドが文字列ではありません");
    }
    return { casual: parsed.casual, polished: parsed.polished };
  };

  try {
    let raw: string;
    try {
      raw = await callClaude();
      return NextResponse.json({ ...parseResponse(raw), usage });
    } catch {
      // JSONパース失敗 → 1回だけリトライ
      raw = await callClaude();
      return NextResponse.json({ ...parseResponse(raw), usage });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/generate] 生成失敗:", message);
    return NextResponse.json({ error: `生成に失敗しました: ${message}` }, { status: 500 });
  }
}
