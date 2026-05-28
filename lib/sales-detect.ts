/**
 * 営業メール簡易判定
 *
 * Phase 0 では「これは営業メールかもしれません」とヒント表示する程度。
 * 自動仕分けはしない。
 */

import { SalesStrength } from "./types";

const SALES_KEYWORDS = [
  "記事広告",
  "ご掲載",
  "掲載のご提案",
  "掲載の検討",
  "資金調達",
  "お打ち合わせ可能日",
  "特別価格",
  "導入のご案内",
  "無料でご提供",
  "広告企画",
  "ご提案させて",
  "営業のご連絡",
  "ご紹介させて",
];

export interface SalesDetectResult {
  isSales: boolean;
  hits: string[];
  reason: string;
}

export function detectSales(body: string, salesStrength: SalesStrength = "strong"): SalesDetectResult {
  const hits = SALES_KEYWORDS.filter((k) => body.includes(k));
  const threshold = salesStrength === "strong" ? 1 : 2;
  const isSales = hits.length >= threshold;
  return {
    isSales,
    hits,
    reason: isSales ? `営業ワード検出：${hits.join("、")}` : "",
  };
}
