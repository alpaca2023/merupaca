/**
 * Firebase Admin SDK 初期化（サーバー側）
 *
 * - ローカル: FIREBASE_ADMIN_* があればサービスアカウントで初期化
 * - App Hosting: 環境のデフォルト認証情報を使って初期化
 *
 * クライアントから変更できない利用制限・課金フィールド更新は Admin SDK 経由で行う。
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const isAppHosting = process.env.FIREBASE_APP_HOSTING === "1";

const hasServiceAccount = !isAppHosting && Boolean(projectId && clientEmail && privateKey);

const adminApp = getApps().length
  ? getApps()[0]
  : hasServiceAccount
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    : initializeApp(projectId ? { projectId } : undefined);

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
