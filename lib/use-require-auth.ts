"use client";

/**
 * 認証必須ページで使うフック
 *
 * 未ログイン状態が確定したら /app/login へ redirect する。
 *
 * 返り値:
 *   { user, ready }
 *   - user: Firebase User（ready=true のとき必ず非 null）
 *   - ready: 初期化完了 + ログイン確認済みなら true
 *
 * 使い方:
 *   const { ready } = useRequireAuth();
 *   if (!ready) return <Loader />;
 *   ...本体...
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { useAuth } from "./auth-context";

export function useRequireAuth(): { user: User | null; ready: boolean } {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/app/login");
    }
  }, [user, loading, router]);

  return { user, ready: !loading && !!user };
}
