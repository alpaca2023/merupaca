/**
 * メルパカ 共通型定義
 */

export type Tone = "casual" | "balanced" | "formal";
export type SalesStrength = "strong" | "weak";

export interface UserProfile {
  /** 会社名（例: "株式会社○○"） */
  company: string;
  /** 氏名（例: "山田 太郎"） */
  name: string;
  /** 略称（例: "山田" — 「○○の山田です」と名乗るときに使う） */
  shortName: string;
  /** 役職（任意） */
  title?: string;
  /** URL（任意） */
  url?: string;
  /** 電話（任意） */
  tel?: string;
  /** 「お世話になっております」を省くか */
  skipAisatsu: boolean;
  /** 文末に「！」を使うか */
  exclaim: boolean;
  /** 文体トーン（オンボーディングで決定。Firestoreスキーマでは tone フィールド） */
  tone: Tone;
  /** 営業判定の強さ */
  salesStrength: SalesStrength;
  /** 文体学習のオプトイン（デフォルト false） */
  learningEnabled: boolean;
  /** プラン */
  plan: "free" | "paid";
  /** Stripe 顧客ID（任意） */
  stripeCustomerId?: string;
  /** 作成日時（ISO文字列 or Firestore Timestamp） */
  createdAt?: string;
}

export interface GenerateRequest {
  /** 受信メール本文（最大3,000文字） */
  body: string;
  /** ユーザーの文体プロフィール */
  profile: UserProfile;
  /** 文体学習サンプル（任意。Step 5 で接続） */
  styleSamples?: string[];
}

export interface GenerateResponse {
  /** 案A: カジュアル */
  casual: string;
  /** 案B: 推敲（丁寧） */
  polished: string;
}

/** 入力本文の最大文字数（M指摘 L-3） */
export const MAX_BODY_LENGTH = 3000;

/** オンボーディングのデフォルト値（M-5 対策で salesStrength も明示） */
export const DEFAULT_PROFILE: Omit<UserProfile, "createdAt"> = {
  company: "",
  name: "",
  shortName: "",
  title: "",
  url: "",
  tel: "",
  skipAisatsu: true,
  exclaim: true,
  tone: "balanced",
  salesStrength: "strong",
  learningEnabled: false,
  plan: "free",
};
