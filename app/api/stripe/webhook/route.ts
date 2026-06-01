/**
 * Stripe Webhook
 *
 * 署名検証後、Checkout / Subscription イベントで users/{uid} の課金状態を更新する。
 * 同一 event.id は stripeWebhookEvents/{event.id} で冪等に処理する。
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyStripeSignature } from "@/lib/stripe-rest";

export const runtime = "nodejs";

type StripeEvent<T = Record<string, unknown>> = {
  id: string;
  type: string;
  data: {
    object: T;
  };
};

type StripeCheckoutSession = {
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

type StripeSubscription = {
  customer?: string;
  id?: string;
  status?: string;
  metadata?: Record<string, string>;
};

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function planFromSubscriptionStatus(status: string | undefined): "free" | "paid" {
  return status === "active" || status === "trialing" ? "paid" : "free";
}

async function applyUserUpdateOnce(
  event: StripeEvent,
  uid: string,
  update: Record<string, unknown>,
): Promise<boolean> {
  const eventRef = getAdminDb().doc(`stripeWebhookEvents/${event.id}`);
  const userRef = getAdminDb().doc(`users/${uid}`);

  return getAdminDb().runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (eventSnap.exists) return false;

    tx.set(eventRef, {
      type: event.type,
      uid,
      status: "processed",
      processedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      userRef,
      {
        ...update,
        lastWebhookEventId: event.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  });
}

async function markIgnoredOnce(event: StripeEvent, reason: string): Promise<boolean> {
  const eventRef = getAdminDb().doc(`stripeWebhookEvents/${event.id}`);
  return getAdminDb().runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (eventSnap.exists) return false;

    tx.set(eventRef, {
      type: event.type,
      status: "ignored",
      reason,
      processedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

async function findUidByStripeCustomerId(customerId: string): Promise<string | null> {
  const snap = await getAdminDb()
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

async function handleCheckoutCompleted(event: StripeEvent<StripeCheckoutSession>): Promise<boolean> {
  const session = event.data.object;
  const uid = getString(session.client_reference_id) || getString(session.metadata?.firebaseUid);
  if (!uid) {
    return markIgnoredOnce(event, "missing_firebase_uid");
  }

  const stripeCustomerId = getString(session.customer);
  const stripeSubscriptionId = getString(session.subscription);

  return applyUserUpdateOnce(event, uid, {
    plan: "paid",
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    subscriptionStatus: "active",
  });
}

async function handleSubscriptionChanged(event: StripeEvent<StripeSubscription>): Promise<boolean> {
  const subscription = event.data.object;
  const uidFromMetadata = getString(subscription.metadata?.firebaseUid);
  const customerId = getString(subscription.customer);
  const uid = uidFromMetadata || (customerId ? await findUidByStripeCustomerId(customerId) : null);

  if (!uid) {
    return markIgnoredOnce(event, "missing_user_for_subscription");
  }

  const status = getString(subscription.status) || "unknown";
  return applyUserUpdateOnce(event, uid, {
    plan: planFromSubscriptionStatus(status),
    ...(customerId ? { stripeCustomerId: customerId } : {}),
    ...(subscription.id ? { stripeSubscriptionId: subscription.id } : {}),
    subscriptionStatus: status,
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET が設定されていません" }, { status: 500 });
  }

  const rawBody = await req.text();
  try {
    verifyStripeSignature(rawBody, req.headers.get("stripe-signature"), webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Webhook payload が JSON ではありません" }, { status: 400 });
  }

  try {
    let processed = false;
    switch (event.type) {
      case "checkout.session.completed":
        processed = await handleCheckoutCompleted(event as StripeEvent<StripeCheckoutSession>);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        processed = await handleSubscriptionChanged(event as StripeEvent<StripeSubscription>);
        break;
      default:
        processed = await markIgnoredOnce(event, "unsupported_event_type");
        break;
    }

    return NextResponse.json({ received: true, processed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
