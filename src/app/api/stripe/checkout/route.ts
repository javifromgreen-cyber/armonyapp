import { NextResponse, type NextRequest } from "next/server";
import { hasProAccess, isBillingPlan } from "@/domain/entitlements";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { getSupabaseAdminClient } from "@/platform/supabase/admin";
import { getStripeClient } from "@/platform/stripe/client";
import { getStripePriceId } from "@/platform/stripe/env";
import { parseStripeSubscriptionStatus } from "@/platform/stripe/syncSubscription";
import { locales, type Locale } from "@/i18n/routing";

// Stripe's Node SDK and signature verification need Node's crypto — never Edge.
export const runtime = "nodejs";

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

interface PlatformBillingIdentityRow {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

/**
 * Starts a Stripe-hosted Checkout Session for ONA Pro (ONA Functional
 * Phase 2). The ONLY thing the client controls is a trusted plan
 * identifier (`"monthly" | "annual"`) — never a raw Stripe Price ID; see
 * `getStripePriceId` for the server-side mapping. Requires an authenticated
 * Supabase session; unauthenticated requests are rejected outright (the
 * caller — `CheckoutButton` — never even calls this endpoint for a
 * signed-out visitor, reusing the existing sign-in+`returnTo` pattern
 * instead, but this route enforces it independently regardless).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const candidate = body as { plan?: unknown; locale?: unknown } | null;
  if (!isBillingPlan(candidate?.plan)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  const plan = candidate.plan;
  const locale: Locale = isLocale(candidate?.locale) ? candidate.locale : "en";

  // Matches `getPlatformAccess`'s own fail-closed pattern: a Supabase
  // config/network failure here must read as "unauthenticated", never
  // crash into a raw 500 that could leak internals to the caller.
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  let user: { id: string; email: string | null };
  try {
    supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    user = { id: authUser.id, email: authUser.email ?? null };
  } catch (error) {
    console.error(
      "Failed to resolve the authenticated user for checkout.",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("Missing NEXT_PUBLIC_SITE_URL; cannot build a Stripe success/cancel URL.");
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  let priceId: string;
  try {
    priceId = getStripePriceId(plan);
  } catch (error) {
    console.error("Stripe checkout misconfigured.", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "configuration_error" }, { status: 500 });
  }

  const stripe = getStripeClient();

  // The authenticated user's own SSR client can read its own row (RLS
  // select-only policy) — no admin client needed for this lookup. A read
  // failure here (including the Phase 2 migration not applied yet) falls
  // back to "no existing customer on file" rather than crashing the
  // request — worst case, a new Stripe customer is created below, which is
  // harmless and self-corrects once the webhook writes the real row.
  let billingRow: PlatformBillingIdentityRow | null = null;
  try {
    const { data } = await supabase
      .from("platform_billing")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle<PlatformBillingIdentityRow>();
    billingRow = data;
  } catch (error) {
    console.error(
      "Failed to read platform_billing before checkout; proceeding as a new customer.",
      error instanceof Error ? error.message : error,
    );
  }

  // Only one ONA Pro subscription per account: verify against Stripe's own
  // CURRENT state rather than trusting a possibly-stale local row — a
  // locally "active" row could already have lapsed, and blocking on stale
  // data would wrongly refuse a customer who genuinely needs to resubscribe.
  if (billingRow?.stripe_subscription_id) {
    try {
      const existingSubscription = await stripe.subscriptions.retrieve(billingRow.stripe_subscription_id);
      const item = existingSubscription.items.data[0];
      const currentPeriodEnd = item ? new Date(item.current_period_end * 1000) : null;
      const status = parseStripeSubscriptionStatus(existingSubscription.status);
      if (hasProAccess({ subscriptionStatus: status, currentPeriodEnd })) {
        return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
      }
    } catch (error) {
      // If Stripe itself is unreachable, don't block checkout indefinitely
      // on a lookup we can't complete — proceed, and let the webhook keep
      // being the source of truth going forward.
      console.error(
        "Failed to verify existing Stripe subscription before starting checkout.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Reuse an existing Stripe Customer for this account rather than
  // creating a new one on every click.
  let customerId = billingRow?.stripe_customer_id ?? null;
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const admin = getSupabaseAdminClient();
      const { error: upsertError } = await admin
        .from("platform_billing")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
      if (upsertError) {
        console.error("Failed to store the new Stripe customer id.", upsertError.message);
        // Not fatal — the webhook can still resolve the account via the
        // subscription/session metadata set below.
      }
    } catch (error) {
      console.error("Failed to create a Stripe customer.", error instanceof Error ? error.message : error);
      return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
      managed_payments: { enabled: true },
      success_url: `${siteUrl}/${locale}/billing/success`,
      cancel_url: `${siteUrl}/${locale}/billing/cancel`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create a Stripe Checkout Session.", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
