/**
 * Firebase Admin SDK 初期化（プレースホルダー）
 *
 * Step 3 の Stripe Webhook で users/{uid}.plan を更新するときに有効化する。
 * Step 1 では import 可能な状態だけ整える。
 */

// import { cert, getApps, initializeApp } from "firebase-admin/app";
// import { getFirestore } from "firebase-admin/firestore";
//
// const adminApp = getApps().length
//   ? getApps()[0]
//   : initializeApp({
//       credential: cert({
//         projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//       }),
//     });
//
// export const adminDb = getFirestore(adminApp);

// Step 3 で有効化
export const FIREBASE_ADMIN_PLACEHOLDER = true;
