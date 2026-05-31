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

export const firebaseApp = getFirebaseApp();
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
