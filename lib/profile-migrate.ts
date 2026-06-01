"use client";

/**
 * プロフィール取得 + 旧 localStorage からのマイグレーション
 *
 * フロー（冪等）:
 *   1. Firestore に既存があればそれを返す
 *   2. なければ旧 localStorage を見て、あれば Firestore に移して localStorage クリア
 *   3. どちらにもなければ null（呼び出し側で onboarding 誘導）
 *
 * 何度実行しても同じ結果。Step 1 ユーザーのアップグレード時に自動でデータが残る。
 */

import { UserProfile, DEFAULT_PROFILE } from "./types";
import {
  loadProfile,
  saveProfile,
  loadLegacyLocalProfile,
  clearLegacyLocalProfile,
} from "./profile-store";

export async function getOrMigrateProfile(uid: string): Promise<UserProfile | null> {
  // 1. Firestore 優先
  const fromFirestore = await loadProfile(uid);
  if (fromFirestore) return fromFirestore;

  // 2. localStorage に旧データがあれば Firestore に移行
  const legacy = loadLegacyLocalProfile();
  if (legacy) {
    // L-1 対策：欠損キーは DEFAULT_PROFILE で補完してから移行
    // （旧データに learningEnabled / plan などのキーが無い可能性に備える）
    const merged: UserProfile = { ...DEFAULT_PROFILE, ...legacy };
    // createdAt が無ければ saveProfile 側で serverTimestamp が入る
    await saveProfile(uid, merged);
    clearLegacyLocalProfile();
    return merged;
  }

  // 3. 新規ユーザー（オンボーディング誘導）
  return null;
}
