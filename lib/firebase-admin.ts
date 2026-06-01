/**
 * Firebase Admin SDK 初期化（サーバー側）
 *
 * - ローカル: FIREBASE_ADMIN_* があればサービスアカウントで初期化
 * - App Hosting: 環境のデフォルト認証情報を使って初期化
 *
 * クライアントから変更できない利用制限・課金フィールド更新は Admin SDK 経由で行う。
 */

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const isAppHosting = process.env.FIREBASE_APP_HOSTING === "1";
  const hasServiceAccount = !isAppHosting && Boolean(projectId && clientEmail && privateKey);

  if (hasServiceAccount) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (err) {
      console.warn(
        "[firebase-admin] Service account credential failed; falling back to application default credentials.",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  adminApp = initializeApp(projectId ? { projectId } : undefined);
  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
