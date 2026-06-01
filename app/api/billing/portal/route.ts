/**
 * Stripe Customer Portal Session 作成
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  getBaseUrl,
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
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "ログイン情報を確認できませんでした" }, { status: 401 });
  }

  try {
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    const stripeCustomerId = userSnap.data()?.stripeCustomerId;
    if (!userSnap.exists || typeof stripeCustomerId !== "string" || stripeCustomerId.length === 0) {
      return NextResponse.json({ error: "Stripe 顧客情報が未作成です" }, { status: 400 });
    }

    const params = new URLSearchParams({
      customer: stripeCustomerId,
      return_url: `${getBaseUrl(req.nextUrl.origin)}/app/settings`,
    });

    const session = await stripeFormRequest<StripeSessionResponse>("/billing_portal/sessions", params);
    if (!session.url) {
      throw new Error("Stripe Customer Portal URL を取得できませんでした");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
