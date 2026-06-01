"use client";

/**
 * ログインページ（/app/login）
 *
 * 2方式：
 *   1. Google ログイン（ポップアップ）
 *   2. メールリンクログイン（パスワード不要）
 *
 * ログイン済みなら /app に redirect。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Mode = "idle" | "sending" | "sent";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInGoogle, sendEmailLink } = useAuth();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ログイン済みなら /app へ
  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [user, loading, router]);

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInGoogle();
      // onAuthStateChanged → user 更新 → 上の useEffect で redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("有効なメールアドレスを入力してください");
      return;
    }
    setMode("sending");
    try {
      await sendEmailLink(trimmed);
      setMode("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMode("idle");
    }
  };

  return (
    <main className="min-h-screen bg-[--bg]">
      <div className="max-w-[420px] mx-auto px-5 pt-12 pb-20">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🦙</div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-black mb-1">メルパカ</h1>
          <p className="text-sm text-[--text-secondary] leading-relaxed">
            AIがあなたの文体で<br />メール返信を下書きします
          </p>
        </div>

        {mode === "sent" ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <Check size={48} strokeWidth={2.4} className="mx-auto mb-3 text-[--success]" />
            <h2 className="font-bold text-base mb-2">メールを送信しました</h2>
            <p className="text-sm text-[--text-secondary] leading-relaxed">
              <strong className="text-black">{email}</strong> 宛にログイン用リンクを送りました。<br />
              メール内のリンクをクリックしてログインを完了してください。
            </p>
            <button
              onClick={() => {
                setMode("idle");
                setEmail("");
              }}
              className="mt-5 text-sm text-[--tint] font-semibold"
            >
              別のメールアドレスで再送する
            </button>
          </div>
        ) : (
          <>
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading || mode === "sending"}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white border border-[--border] text-black font-semibold text-base shadow-sm disabled:opacity-40 mb-3"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <GoogleIcon />
              )}
              Google でログイン
            </button>

            {/* 区切り */}
            <div className="flex items-center gap-3 my-5 text-xs text-[--text-secondary]">
              <div className="flex-1 h-px bg-[--border]" />
              <span>または</span>
              <div className="flex-1 h-px bg-[--border]" />
            </div>

            {/* Email link */}
            <form onSubmit={handleEmailLink} className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-semibold text-[--text-secondary] mb-2 block">
                メールアドレスでログイン
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={mode === "sending"}
                className="w-full text-[15px] py-2 mb-3 bg-transparent border-b border-[--border] focus:border-[--tint] transition-colors"
              />
              <button
                type="submit"
                disabled={mode === "sending" || googleLoading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[--tint] text-white font-bold text-sm disabled:opacity-40"
              >
                {mode === "sending" ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    送信中…
                  </>
                ) : (
                  <>
                    <Mail size={16} strokeWidth={2.4} />
                    ログイン用リンクを送る
                  </>
                )}
              </button>
              <p className="mt-3 text-[11px] text-[--text-secondary] leading-relaxed">
                パスワードは不要です。送信したメール内のリンクをクリックするとログインできます。
              </p>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-[--danger]/10 text-[--danger] text-xs leading-relaxed">
                <AlertCircle size={14} className="flex-shrink-0 mt-[2px]" />
                <span>{error}</span>
              </div>
            )}

            <p className="mt-8 text-center text-[11px] text-[--text-secondary] leading-relaxed">
              ログインすると<a href="#" className="text-[--tint]">利用規約</a>と<a href="#" className="text-[--tint]">プライバシーポリシー</a>に同意したものとみなします。
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
