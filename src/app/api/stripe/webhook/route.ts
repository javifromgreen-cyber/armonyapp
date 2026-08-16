import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/platform/stripe/client";
import { getStripeWebhookSecret } from "@/platform/stripe/env";
import { getSupabaseAdminClient } from "@/platform/supabase/admin";
import { syncSubscriptionToSupabase } from "@/platform/stripe/syncSubscription";

// Stripe signature verification needs the raw body and Node's crypto — never Edge.
export const runtime = "nodejs";

/**
 * The authoritative Stripe -> ONA sync path (ONA Functional Phase 2).
 * `STRIPE_WEBHOOK_SECRET` does not exist yet in this environment (the
 * endpoint must be deployed before its signing secret can be created in
 * the Stripe Dashboard — see docs/stripe-billing-setup.md) — this route
 * fails closed with a safe 503 in that case, and the rest of the app
 * (including `next build`) does not depend on this variable at all.
 */
export async function POST(request: NextRequest) {
  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    console.error(
      "Stripe webhook invoked before STRIPE_WEBHOOK_SECRET is configured.",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // The RAW, unparsed body — required for signature verification. Never
  // call request.json() first; re-serializing would break the signature.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed.",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(
      `Stripe webhook processing failed for event ${event.id} (${event.type}).`,
      error instanceof Error ? error.message : error,
    );
    // A non-2xx tells Stripe to retry — correct here, since this branch
    // means the event was NOT marked processed (see handleStripeEvent).
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Idempotent by construction: the event ID is recorded in
 * `stripe_webhook_events` only AFTER its synchronization succeeds, never
 * before — so a failed sync can still be retried by Stripe, and a
 * concurrent duplicate delivery either finds the event already recorded
 * (early return) or safely re-runs an idempotent upsert and then loses the
 * race on the final insert (ignored — see the unique_violation check).
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const admin = getSupabaseAdminClient();

  const { data: alreadyProcessed } = await admin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (alreadyProcessed) {
    return;
  }

  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        // Always re-fetch the CURRENT subscription state rather than
        // trusting this event's own snapshot — guards against an
        // out-of-order older event overwriting newer state.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToSupabase(admin, subscription);
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      // No entitlement write here on purpose — customer.subscription.updated
      // and invoice.payment_failed already carry the authoritative status
      // change for a failed async payment method.
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
      await syncSubscriptionToSupabase(admin, subscription);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscriptionRef = event.data.object.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToSupabase(admin, subscription);
      }
      break;
    }
    default:
      break;
  }

  const { error: markProcessedError } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    stripe_created_at: event.created,
  });
  if (markProcessedError && markProcessedError.code !== "23505") {
    // 23505 = unique_violation — a concurrent duplicate delivery already
    // recorded this event; harmless, not a real failure.
    throw new Error(`Failed to record processed Stripe event ${event.id}: ${markProcessedError.message}`);
  }
}
