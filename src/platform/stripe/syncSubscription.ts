import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planFromPriceId, type StripeSubscriptionStatus } from "@/domain/entitlements";
import { getConfiguredStripePriceIds } from "./env";

const KNOWN_STATUSES: ReadonlySet<string> = new Set<StripeSubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

/**
 * Narrows Stripe's `Subscription.status` (typed as a wider string to allow
 * for statuses Stripe adds later — see `stripe-node`'s `OtherString`) down
 * to this app's own known-status union via a runtime membership check —
 * never an unchecked cast. An unrecognized status (a genuinely new Stripe
 * status this app doesn't know about yet) returns `null`, which
 * `hasProAccess` (`src/domain/entitlements/billing.ts`) already treats as
 * "no Pro access" — the safe, fail-closed default for something unknown.
 */
export function parseStripeSubscriptionStatus(status: string): StripeSubscriptionStatus | null {
  return KNOWN_STATUSES.has(status) ? (status as StripeSubscriptionStatus) : null;
}

export interface SubscriptionSyncResult {
  supabaseUserId: string | null;
  synced: boolean;
}

/**
 * Synchronizes ONE Stripe Subscription's CURRENT, full state into
 * `public.platform_billing` — an upsert of the complete row, never an
 * incremental delta, which is what makes this safe to call repeatedly and
 * out of order: whichever call happens last simply reflects Stripe's truth
 * at the time it was fetched. Callers (the webhook route) always pass a
 * freshly-`retrieve()`-d subscription, not a webhook payload's snapshot, so
 * a late-arriving older event can't overwrite newer state.
 *
 * Keyed by the Supabase user id recorded in the subscription's OWN
 * metadata (`subscription_data.metadata.supabase_user_id`, set by THIS
 * app's own checkout route when the subscription is created) — never
 * customer email, never any client-supplied field. A subscription with no
 * such metadata (e.g. created directly in the Stripe Dashboard, outside
 * ONA's checkout flow) cannot be safely linked to any account; this
 * function refuses to guess and returns `synced: false` instead.
 */
export async function syncSubscriptionToSupabase(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<SubscriptionSyncResult> {
  const supabaseUserId = subscription.metadata.supabase_user_id;
  if (!supabaseUserId) {
    console.warn(
      `Stripe subscription ${subscription.id} has no supabase_user_id metadata; refusing to guess which account it belongs to.`,
    );
    return { supabaseUserId: null, synced: false };
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const stripePriceId = item?.price.id ?? null;
  const currentPeriodEndUnix = item?.current_period_end ?? null;
  const plan = stripePriceId ? planFromPriceId(stripePriceId, getConfiguredStripePriceIds()) : null;
  const status = parseStripeSubscriptionStatus(subscription.status);

  const { error } = await admin.from("platform_billing").upsert(
    {
      user_id: supabaseUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
      plan,
      // Stores Stripe's raw status string even if unrecognized (never
      // silently dropped) — only the ACCESS computation (`hasProAccess`)
      // treats an unrecognized status as non-granting, not this write.
      subscription_status: status ?? subscription.status,
      current_period_end: currentPeriodEndUnix
        ? new Date(currentPeriodEndUnix * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to sync platform_billing for user ${supabaseUserId}: ${error.message}`);
  }

  return { supabaseUserId, synced: true };
}
