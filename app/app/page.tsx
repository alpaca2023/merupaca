"use client";

/**
 * メルパカ アプリ本体（/app）
 *
 * Step 1 の責務：
 *  1. オンボーディング未完了なら /app/onboarding へ誘導
 *  2. 受信メール本文を貼り付ける入力画面
 *  3. /api/generate を呼んで案A/Bを取得し、結果画面で選択 → 編集 → コピー
 *
 * H-2 対応：「送信ボタン」は実装しない。あくまでコピーまで。
 * L-3 対応：入力 3,000 文字バリデーション
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  Check,
  Smile,
  BookOpen,
  Pencil,
  MoreHorizontal,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getOrMigrateProfile } from "@/lib/profile-migrate";
import { UserProfile, MAX_BODY_LENGTH, GenerateResponse } from "@/lib/types";
import { detectSales } from "@/lib/sales-detect";
import { useRequireAuth } from "@/lib/use-require-auth";
import { AuthWaitFallback } from "@/lib/auth-wait-fallback";

const TINT = "#0a84ff";

type Stage = "input" | "result";
type Variant = "casual" | "polished";

export default function AppPage() {
  const router = useRouter();
  // Auth gate：未ログインなら /app/login へ自動遷移
  const { ready: authReady, user } = useRequireAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [usage, setUsage] = useState<GenerateResponse["usage"] | null>(null);
  const [variant, setVariant] = useState<Variant>("casual");
  const [editedCasual, setEditedCasual] = useState("");
  const [editedPolished, setEditedPolished] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 認証通過後：Firestore からプロフィール取得（旧 localStorage からは自動マイグレート）
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getOrMigrateProfile(user.uid);
        if (cancelled) return;
        if (!p) {
          router.replace("/app/onboarding");
          return;
        }
        setProfile(p);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(`プロフィールの読み込みに失敗しました。再読み込みしてください。(${msg})`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user, router]);

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleGenerate = async () => {
    if (!profile || !user) return;
    setError(null);

    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("受信メール本文を貼り付けてください");
      return;
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      setError(`本文は ${MAX_BODY_LENGTH} 文字以内にしてください（現在 ${trimmed.length} 文字）`);
      return;
    }

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ body: trimmed, profile }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `生成に失敗しました（${res.status}）`);
      }
      const data = (await res.json()) as GenerateResponse;
      setResult(data);
      setUsage(data.usage ?? null);
      setEditedCasual(data.casual);
      setEditedPolished(data.polished);
      setVariant("casual");
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = variant === "casual" ? editedCasual : editedPolished;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      fire("コピーしました。メーラーに貼り付けてください");
      setTimeout(() => setCopied(false), 2400);
      // Step 5 で learningEnabled === true の場合に styleSamples 保存をここで行う
    } catch {
      setError("コピーに失敗しました。手動で選択してください");
    }
  };

  const handleReset = () => {
    setStage("input");
    setBody("");
    setResult(null);
    setUsage(null);
    setError(null);
  };

  if (!ready || !profile) {
    return <AuthWaitFallback message="アプリを準備しています" />;
  }

  const sales = stage === "input" ? detectSales(body, profile.salesStrength) : { isSales: false, hits: [], reason: "" };

  return (
    <main className="min-h-screen bg-[--bg]">
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-24">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-semibold text-[--text-secondary]">🦙 メルパカ</div>
            <h1 className="text-[28px] font-extrabold tracking-tight leading-tight text-black">
              {stage === "input" ? "返信案を作る" : "返信案"}
            </h1>
          </div>
          <button
            onClick={() => router.push("/app/settings")}
            className="w-10 h-10 rounded-full bg-black/[.06] flex items-center justify-center"
            aria-label="設定"
          >
            <MoreHorizontal size={20} color={TINT} />
          </button>
        </div>

        {/* 入力画面 */}
        {stage === "input" && (
          <>
            <p className="text-sm text-[--text-secondary] mb-3 leading-relaxed">
              受信メールの本文を貼り付けると、あなたの文体で案A（カジュアル）/ 案B（丁寧）を作ります。
            </p>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-semibold text-[--text-secondary] flex items-center justify-between mb-2">
                <span>受信メール本文</span>
                <span className={body.length > MAX_BODY_LENGTH ? "text-[--danger]" : ""}>
                  {body.length} / {MAX_BODY_LENGTH}
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="ここに受信したメールの本文を貼り付けてください"
                className="w-full min-h-[220px] text-[15px] leading-relaxed resize-y bg-transparent"
              />
            </div>

            {sales.isSales && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-[#ff9f0a]/10 text-[#c77700] text-xs leading-relaxed">
                <AlertCircle size={14} className="flex-shrink-0 mt-[2px]" />
                <span>
                  これは営業メールかもしれません（{sales.hits.join("、")}）。返信不要の可能性があります。
                </span>
              </div>
            )}

            {error && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-[--danger]/10 text-[--danger] text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || body.trim().length === 0}
              className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[--tint] text-white font-bold text-base disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles size={18} strokeWidth={2.4} />
                  返信案を作る
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-[--text-secondary] leading-relaxed">
              受信メール本文はサーバーに保存されません。生成にのみ使われます。
            </p>
          </>
        )}

        {/* 結果画面 */}
        {stage === "result" && result && (
          <>
            <p className="text-sm text-[--text-secondary] mb-3">案を選んで、必要なら編集してコピーしてください。</p>

            {/* バリアント選択 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setVariant("casual")}
                className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-white border-2 ${
                  variant === "casual" ? "border-[--tint] bg-[--tint]/5" : "border-transparent"
                }`}
              >
                <Smile size={20} color={variant === "casual" ? TINT : "#8e8e93"} strokeWidth={2.2} />
                <div className={`font-extrabold text-[16px] ${variant === "casual" ? "text-[--tint]" : "text-black"}`}>
                  案A
                </div>
                <div className="text-xs font-semibold text-[--text-secondary]">カジュアル</div>
              </button>
              <button
                onClick={() => setVariant("polished")}
                className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-white border-2 ${
                  variant === "polished" ? "border-[--tint] bg-[--tint]/5" : "border-transparent"
                }`}
              >
                <BookOpen size={20} color={variant === "polished" ? TINT : "#8e8e93"} strokeWidth={2.2} />
                <div className={`font-extrabold text-[16px] ${variant === "polished" ? "text-[--tint]" : "text-black"}`}>
                  案B
                </div>
                <div className="text-xs font-semibold text-[--text-secondary]">推敲（丁寧）</div>
              </button>
            </div>

            {/* 本文編集 */}
            <div className="flex items-center justify-between text-xs text-[--text-secondary] font-semibold mb-2 px-1">
              <span>本文（タップして編集できます）</span>
              <Pencil size={13} strokeWidth={2.2} />
            </div>
            <textarea
              value={variant === "casual" ? editedCasual : editedPolished}
              onChange={(e) =>
                variant === "casual" ? setEditedCasual(e.target.value) : setEditedPolished(e.target.value)
              }
              className="w-full min-h-[260px] text-[14.5px] leading-[1.7] p-4 rounded-2xl bg-white border border-[--border] resize-y whitespace-pre-wrap"
            />

            <button
              onClick={handleCopy}
              className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[--tint] text-white font-bold text-base"
            >
              {copied ? (
                <>
                  <Check size={18} strokeWidth={2.4} />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy size={18} strokeWidth={2.4} />
                  コピーする
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="mt-3 w-full text-center py-3 text-[--text-secondary] font-semibold text-sm"
            >
              別のメールで作り直す
            </button>

            <p className="mt-3 text-center text-[11px] text-[--text-secondary] leading-relaxed">
              コピーしたら自分のメーラーに貼り付けて送信してください。<br />
              メルパカからメールは送信されません。
              {usage?.plan === "free" && usage.remaining !== null && (
                <>
                  <br />
                  本日の残り生成回数: {usage.remaining} / {usage.limit}
                </>
              )}
            </p>
          </>
        )}

        {/* トースト */}
        {toast && (
          <div className="toast-in fixed left-1/2 -translate-x-1/2 bottom-10 z-50 flex items-center gap-2 bg-black/85 backdrop-blur text-white px-4 py-3 rounded-full text-sm font-semibold shadow-lg">
            <Check size={16} strokeWidth={3} />
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
