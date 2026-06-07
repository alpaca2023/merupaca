"use client";

/**
 * LP の CTA ボタン（認証状態に応じて出し分け）
 *
 * - 未ログイン      → 「無料で試す」→ /app/login
 * - ログイン済み    → 「アプリを開く」→ /app
 * - 判定中(loading) → リンク先は /app/login のまま（中身は同じラベル）
 *
 * LP 本体はサーバーコンポーネントのまま SEO 用に静的描画し、
 * 認証で変わる導線だけをこのクライアントコンポーネントに閉じ込める。
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function LandingCTA({
  size = "large",
  label = "無料で試す",
}: {
  size?: "large" | "small";
  label?: string;
}) {
  const { user, loading } = useAuth();
  const loggedIn = !loading && !!user;

  const href = loggedIn ? "/app" : "/app/login";
  const text = loggedIn ? "アプリを開く" : label;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-[--tint] text-white font-bold shadow-sm transition-transform active:scale-[0.97]";
  const sizing =
    size === "large"
      ? "px-7 py-4 text-base w-full sm:w-auto"
      : "px-5 py-3 text-sm";

  return (
    <Link href={href} className={`${base} ${sizing}`}>
      {text}
      <ArrowRight size={size === "large" ? 18 : 16} strokeWidth={2.4} />
    </Link>
  );
}
