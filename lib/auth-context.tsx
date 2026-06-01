"use client";

/**
 * 認証 Context
 *
 * Firebase Auth の onAuthStateChanged を購読し、
 * 子コンポーネントに user / loading 状態と各種認証メソッドを提供する。
 *
 * 提供メソッド：
 *  - signInGoogle(): Google ポップアップログイン
 *  - sendEmailLink(email): メールリンクログイン用リンクを送信
 *  - completeEmailLink(email, link): メールリンク戻り後の認証完了
 *  - signOutUser(): ログアウト
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  ActionCodeSettings,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

/**
 * メールリンクログインで送信したメールアドレスを localStorage に
 * 一時保存するキー。リンクをクリックした端末側で再取得して
 * signInWithEmailLink に渡す（Firebase 推奨パターン）。
 */
const EMAIL_FOR_SIGNIN_KEY = "merupaca:emailForSignIn";
const AUTH_INIT_TIMEOUT_MS = 8000;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  completeEmailLink: (email: string, link: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  /** メールリンクで送ったメールアドレスを取得（localStorage） */
  getStoredEmail: () => string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInGoogle: async () => {},
  sendEmailLink: async () => {},
  completeEmailLink: async () => {},
  signOutUser: async () => {},
  getStoredEmail: () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn("[auth] Firebase Auth initialization timed out");
      setUser(null);
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        settled = true;
        window.clearTimeout(timeout);
        setUser(u);
        setLoading(false);
      },
      (error) => {
        settled = true;
        window.clearTimeout(timeout);
        console.error("[auth] Firebase Auth initialization failed:", error);
        setUser(null);
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signInGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged が user を更新する
  }, []);

  const sendEmailLink = useCallback(async (email: string) => {
    if (typeof window === "undefined") {
      throw new Error("sendEmailLink はクライアントでのみ呼び出せます");
    }
    const actionCodeSettings: ActionCodeSettings = {
      url: `${window.location.origin}/app/auth/callback`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email);
  }, []);

  const completeEmailLink = useCallback(async (email: string, link: string) => {
    if (!isSignInWithEmailLink(auth, link)) {
      throw new Error("無効なログインリンクです");
    }
    await signInWithEmailLink(auth, email, link);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const getStoredEmail = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInGoogle,
        sendEmailLink,
        completeEmailLink,
        signOutUser,
        getStoredEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
