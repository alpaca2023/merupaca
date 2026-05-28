"use client";

/**
 * 認証 Context（プレースホルダー）
 *
 * Step 2 で Firebase Auth の onAuthStateChanged を購読し、
 * ユーザー情報・ログイン状態・サインアウト関数を提供する。
 * Step 1 では import 可能な状態だけ整える。
 */

import { createContext, useContext, ReactNode } from "react";

interface AuthContextValue {
  /** Step 2 で Firebase User 型に差し替える */
  user: null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Step 2 で onAuthStateChanged 購読・サインアウト関数を追加
  return <AuthContext.Provider value={{ user: null, loading: false }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
