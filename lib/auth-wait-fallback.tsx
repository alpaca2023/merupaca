"use client";

import { Loader2 } from "lucide-react";

export function AuthWaitFallback({
  message = "ログイン状態を確認しています",
}: {
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-[--bg] flex items-center justify-center px-5">
      <div className="max-w-[360px] w-full text-center">
        <Loader2 className="animate-spin mx-auto mb-4 text-[--tint]" size={28} />
        <p className="text-sm font-semibold text-black">{message}</p>
        <p className="mt-2 text-xs text-[--text-secondary] leading-relaxed">
          画面が変わらない場合はログイン画面から開き直してください。
        </p>
        <a
          href="/app/login"
          className="mt-5 inline-flex items-center justify-center w-full rounded-xl bg-[--tint] px-4 py-3 text-sm font-bold text-white"
        >
          ログイン画面へ
        </a>
      </div>
    </main>
  );
}
