/**
 * Stripe Checkout Session 作成
 *
 * Firebase ID token で本人確認し、Stripe 側に firebaseUid を持たせる。
 * Webhook 側はこの uid を使って users/{uid}.plan を更新する。
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getBaseUrl,
  getStripePriceId,
  stripeFormRequest,
  StripeSessionResponse,
} from "@/lib/stripe-rest";

export const runtime = "nodejs";

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: "ログイン情報を確認できませんでした" }, { status: 401 });
  }

  try {
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "プロフィールが未作成です" }, { status: 403 });
    }

    const baseUrl = getBaseUrl(req.nextUrl.origin);
    const params = new URLSearchParams({
      mode: "subscription",
      success_url: `${baseUrl}/app/settings?billing=success`,
      cancel_url: `${baseUrl}/app/settings?billing=cancel`,
      client_reference_id: uid,
      "line_items[0][price]": getStripePriceId(),
      "line_items[0][quantity]": "1",
      "metadata[firebaseUid]": uid,
      "subscription_data[metadata][firebaseUid]": uid,
      allow_promotion_codes: "true",
    });

    const stripeCustomerId = userSnap.data()?.stripeCustomerId;
    if (typeof stripeCustomerId === "string" && stripeCustomerId.length > 0) {
      params.set("customer", stripeCustomerId);
    } else if (email) {
      params.set("customer_email", email);
    }

    const session = await stripeFormRequest<StripeSessionResponse>("/checkout/sessions", params);
    if (!session.url) {
      throw new Error("Stripe Checkout URL を取得できませんでした");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
