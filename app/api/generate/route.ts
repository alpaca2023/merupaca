/**
 * /api/generate
 *
 * 受信メール本文 + ユーザー文体プロフィールを受け取り、
 * Claude API で案A（カジュアル）/ 案B（丁寧）を生成する。
 *
 * - サーバー側でのみ ANTHROPIC_API_KEY を使う（クライアントには漏らさない）
 * - 受信メール本文は DB に保存しない（生成処理に使うのみ）
 * - 入力 3,000文字 を超えると 400 を返す（L-3）
 * - JSON パース失敗時は1回リトライ
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage } from "@/lib/system-prompt";
import { GenerateRequest, GenerateResponse, MAX_BODY_LENGTH } from "@/lib/types";

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 2048;

export async function POST(req: NextRequest) {
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

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(payload.profile, payload.styleSamples ?? []);
  const userMessage = buildUserMessage(payload);

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
      return NextResponse.json(parseResponse(raw));
    } catch {
      // JSONパース失敗 → 1回だけリトライ
      raw = await callClaude();
      return NextResponse.json(parseResponse(raw));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/generate] 生成失敗:", message);
    return NextResponse.json({ error: `生成に失敗しました: ${message}` }, { status: 500 });
  }
}
