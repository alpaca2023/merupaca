"use client";

/**
 * メールリンクログインのコールバック（/app/auth/callback）
 *
 * Firebase からのリンクをユーザーがクリックするとこのページに到達する。
 *  1. URL がメールリンクであることを確認
 *  2. ローカルストレージにメールアドレスがあれば自動で認証完了
 *  3. なければ（別端末で開いたケース）ユーザーにメールアドレス入力を求める
 *  4. 完了したら /app へ
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Stage = "verifying" | "ask-email" | "completing" | "done" | "error";

function CallbackInner() {
  const router = useRouter();
  const { user, loading, completeEmailLink, getStoredEmail } = useAuth();
  const [stage, setStage] = useState<Stage>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (loading) return;
    // 既にログイン済みなら /app へ
    if (user) {
      router.replace("/app");
      return;
    }

    const link = typeof window !== "undefined" ? window.location.href : "";
    const stored = getStoredEmail();

    if (stored) {
      // 同一端末：保存済みメールアドレスで自動完了
      (async () => {
        setStage("completing");
        try {
          await completeEmailLink(stored, link);
          setStage("done");
          router.replace("/app");
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStage("error");
        }
      })();
    } else {
      // 別端末で開いたケース：ユーザーに入力を求める
      setStage("ask-email");
    }
  }, [user, loading, router, completeEmailLink, getStoredEmail]);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = emailInput.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("有効なメールアドレスを入力してください");
      return;
    }
    setStage("completing");
    try {
      await completeEmailLink(trimmed, window.location.href);
      setStage("done");
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  };

  return (
    <main className="min-h-screen bg-[--bg] flex items-center justify-center px-5">
      <div className="max-w-[420px] w-full text-center">
        {stage === "verifying" || stage === "completing" ? (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-[--tint]" size={32} />
            <p className="text-sm text-[--text-secondary]">
              {stage === "verifying" ? "ログインリンクを確認中…" : "ログイン処理中…"}
            </p>
          </>
        ) : stage === "done" ? (
          <>
            <Check size={48} strokeWidth={2.4} className="mx-auto mb-3 text-[--success]" />
            <p className="text-base font-semibold">ログインしました</p>
            <p className="text-sm text-[--text-secondary] mt-1">移動しています…</p>
          </>
        ) : stage === "ask-email" ? (
          <form onSubmit={handleSubmitEmail} className="bg-white rounded-2xl p-6 shadow-sm text-left">
            <h1 className="text-base font-bold text-black mb-2">ログインを完了します</h1>
            <p className="text-xs text-[--text-secondary] leading-relaxed mb-4">
              別の端末からリンクを開いたようです。
              ログインに使うメールアドレスをもう一度入力してください。
            </p>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-[15px] py-2 mb-4 bg-transparent border-b border-[--border] focus:border-[--tint] transition-colors"
            />
            <button
              type="submit"
              disabled={!emailInput.trim()}
              className="w-full py-3 rounded-xl bg-[--tint] text-white font-bold text-sm disabled:opacity-40"
            >
              ログインを完了する
            </button>
            {error && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-[--danger]/10 text-[--danger] text-xs leading-relaxed">
                <AlertCircle size={14} className="flex-shrink-0 mt-[2px]" />
                <span>{error}</span>
              </div>
            )}
          </form>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <AlertCircle size={32} className="mx-auto mb-3 text-[--danger]" />
            <p className="font-semibold text-black mb-2">ログインに失敗しました</p>
            <p className="text-xs text-[--text-secondary] leading-relaxed mb-4">{error}</p>
            <button
              onClick={() => router.replace("/app/login")}
              className="w-full py-3 rounded-xl bg-[--tint] text-white font-bold text-sm"
            >
              ログイン画面に戻る
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
