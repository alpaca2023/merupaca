"use client";

/**
 * プロフィール永続化（Firestore + 旧 localStorage マイグレーション補助）
 *
 * 主 API（Firestore）:
 *   - loadProfile(uid): Firestore から本人のプロフィールを読む
 *   - saveProfile(uid, profile): Firestore に保存（merge）
 *   - clearProfile(uid): Firestore のドキュメントを削除
 *
 * 旧 API（localStorage、PR-B マイグレーション完了まで残す）:
 *   - loadLegacyLocalProfile()
 *   - clearLegacyLocalProfile()
 *
 * 設計判断（PR-B プラン D2）:
 *   createdAt は Firestore serverTimestamp() で初回のみ自動生成。
 *   read 時に Timestamp → ISO 文字列に正規化する（既存型を変えない）。
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./types";

const LEGACY_LOCAL_KEY = "merupaca:profile:v1";

// ---------- Firestore API ----------

/**
 * Firestore から本人のプロフィールを読む。
 * ドキュメントが存在しない場合は null。
 */
export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return normalizeProfile(data);
}

/**
 * Firestore にプロフィールを保存（merge）。
 * createdAt が未設定の場合のみ serverTimestamp() を入れる。
 */
export async function saveProfile(uid: string, profile: UserProfile): Promise<void> {
  const payload: Record<string, unknown> = { ...profile };
  // 初回保存時のみ createdAt を serverTimestamp で設定
  if (!profile.createdAt) {
    payload.createdAt = serverTimestamp() satisfies FieldValue;
  }
  await setDoc(doc(db, "users", uid), payload, { merge: true });
}

/**
 * Firestore のプロフィールを削除。
 */
export async function clearProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

/**
 * Firestore 生データを UserProfile に正規化。
 * createdAt は Timestamp なら ISO 文字列に変換。
 */
function normalizeProfile(data: Record<string, unknown>): UserProfile {
  const created = data.createdAt;
  let createdAt: string | undefined;
  if (created instanceof Timestamp) {
    createdAt = created.toDate().toISOString();
  } else if (typeof created === "string") {
    createdAt = created;
  } else {
    createdAt = undefined;
  }
  return {
    ...(data as unknown as UserProfile),
    createdAt,
  };
}

// ---------- localStorage 旧 API（マイグレーション用） ----------

/**
 * 旧 localStorage プロフィールを読む（PR-B マイグレーション用）。
 * Step 1 で書き込まれた既存ユーザーのデータを救出する用途。
 */
export function loadLegacyLocalProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (typeof parsed.tone !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 旧 localStorage プロフィールを削除（マイグレーション完了後）。
 */
export function clearLegacyLocalProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_LOCAL_KEY);
}
