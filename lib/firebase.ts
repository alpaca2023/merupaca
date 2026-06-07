/**
 * Firebase Client SDK 初期化（クライアント側）
 *
 * - apphosting.yaml の NEXT_PUBLIC_FIREBASE_* から値を読む
 * - HMR / SSR / route 切替で重複初期化されないように getApps() でガード
 * - Auth: Google ログイン + メールリンクログイン
 * - Firestore: users/{uid} ほか
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Firebase App を一度だけ初期化する。
 * SSR/HMR で複数回 import されても安全。
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

/**
 * Auth を初期化する。
 *
 * apiKey が未設定だと getAuth は `auth/invalid-api-key` を投げる。
 * NEXT_PUBLIC_* はビルド時に値が入るため通常は問題ないが、env 無しの
 * 静的プリレンダリング（公開 LP `/` など）でビルドが落ちないよう、
 * サーバー側でのみ握りつぶす。Auth は常にクライアントでのみ使うため、
 * ブラウザでは従来どおりキー欠落を明確にエラーにする。
 */
function getAuthSafe(app: FirebaseApp): Auth {
  try {
    return getAuth(app);
  } catch (e) {
    if (typeof window === "undefined") {
      return null as unknown as Auth;
    }
    throw e;
  }
}

export const firebaseApp = getFirebaseApp();
export const auth: Auth = getAuthSafe(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
