/**
 * Stripe REST API helper（SDK 依存なし）
 *
 * App Hosting の軽い構成を保つため、Checkout / Portal 作成は
 * application/x-www-form-urlencoded の REST 呼び出しで行う。
 */

import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface StripeSessionResponse {
  id: string;
  url?: string;
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY が設定されていません");
  }
  return key;
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID が設定されていません");
  }
  return priceId;
}

export function getBaseUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_BASE_URL || origin;
}

export async function stripeFormRequest<T>(
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe API request failed: ${res.status}`);
  }
  return data as T;
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): void {
  if (!signatureHeader) {
    throw new Error("Stripe-Signature ヘッダーがありません");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) {
    throw new Error("Stripe-Signature ヘッダーが不正です");
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Stripe Webhook のタイムスタンプが許容範囲外です");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);

  const matched = signatures.some((signature) => {
    const receivedBuffer = Buffer.from(signature);
    return receivedBuffer.length === expectedBuffer.length
      && timingSafeEqual(receivedBuffer, expectedBuffer);
  });

  if (!matched) {
    throw new Error("Stripe Webhook の署名検証に失敗しました");
  }
}
