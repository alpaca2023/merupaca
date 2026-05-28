"use client";

/**
 * 文体プロフィールのローカル永続化（Step 1 暫定）
 *
 * Step 2 で Firebase Auth + Firestore に置き換える。
 * それまでは localStorage に保存することでブラウザ再読み込み後も設定が残るようにする。
 */

import { UserProfile, DEFAULT_PROFILE } from "./types";

const STORAGE_KEY = "merupaca:profile:v1";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    // 必須キーの簡易検証（破損データ対策）
    if (typeof parsed.tone !== "string") return null;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
