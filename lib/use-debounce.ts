"use client";

/**
 * デバウンス付き値フック
 *
 * value が連続して変わるとき、最後の変化から delayMs 経過したタイミングで
 * 1度だけ debounced を更新する。
 *
 * 用途: 設定画面の自動保存（入力連打で Firestore に毎回書かない）
 *
 * 例:
 *   const debounced = useDebouncedValue(profile, 800);
 *   useEffect(() => {
 *     if (debounced) saveProfile(uid, debounced);
 *   }, [debounced]);
 */

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
