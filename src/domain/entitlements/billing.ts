/**
 * Pure Stripe-subscription-state -> Pro-access logic (ONA Functional Phase
 * 2, CLAUDE.md's commercial model: one subscription unlocks every platform
 * app, no tiers). Framework-free by design — this file must never import
 * `stripe`, `@supabase/*`, React, or Next.js (per `CLAUDE.md`'s `/domain`
 * boundary rule, which names Stripe explicitly). `StripeSubscriptionStatus`
 * below is this module's OWN string-literal union, deliberately not
 * `Stripe.Subscription.Status` from the `stripe` package — it happens to
 * match Stripe's own vocabulary because that's the thing it's modeling, not
 * because it's imported from there.
 *
 * `src/platform/access/getPlatformAccess.ts` is the only caller: it reads
 * `public.platform_billing`, builds a `BillingState`, and folds the result
 * of `hasProAccess` together with the 72-hour trial's own status (see
 * `./trial.ts`) into the single overall `EntitlementStatus` (`./types.ts`).
 */
export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface BillingState {
  subscriptionStatus: StripeSubscriptionStatus | null;
  /** The current billing period's end, when Stripe reports one — null for statuses where it isn't meaningful. */
  currentPeriodEnd: Date | null;
}

/**
 * Statuses whose access is bounded by `currentPeriodEnd` under normal
 * operation — a defensive check only, not the primary access rule: Stripe's
 * own webhooks are what actually revoke access (by moving the status to
 * `canceled` and other non-granting statuses once a period genuinely ends).
 * This just stops a stale row (e.g. a delayed webhook) from granting access
 * further into the future than its own recorded period end promises. This
 * is also exactly how `cancel_at_period_end` is honored without needing to
 * read that flag here at all: Stripe keeps `status: "active"` for the full
 * paid period even when cancellation is scheduled, and only flips it to
 * `"canceled"` once the period genuinely ends — so access naturally lasts
 * until then and no longer.
 */
const TIME_BOUNDED_STATUSES: ReadonlySet<StripeSubscriptionStatus> = new Set(["active", "trialing"]);

/**
 * `past_due` deliberately grants access unconditionally (never gated by
 * `currentPeriodEnd`, which for a past-due subscription already lies in the
 * past by definition — that's what "past due" means): Stripe is actively
 * retrying the payment, and revoking access mid-retry would be harsher than
 * Stripe's own dunning flow intends. Access ends only when Stripe itself
 * transitions the subscription away from `past_due` — to `active` on
 * recovery, or to `canceled`/`unpaid` once retries are exhausted.
 *
 * Every other status (`canceled`, `incomplete`, `incomplete_expired`,
 * `unpaid`, `paused`) never grants access.
 */
export function hasProAccess(billing: BillingState | null, now: Date = new Date()): boolean {
  const status = billing?.subscriptionStatus;
  if (!status) {
    return false;
  }
  if (status === "past_due") {
    return true;
  }
  if (TIME_BOUNDED_STATUSES.has(status)) {
    if (billing?.currentPeriodEnd && now.getTime() >= billing.currentPeriodEnd.getTime()) {
      return false;
    }
    return true;
  }
  return false;
}

export type BillingPlan = "monthly" | "annual";

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "monthly" || value === "annual";
}

/**
 * Maps a Stripe Price ID to our own trusted plan identifier — never the
 * reverse. The plan is never inferred from a monetary amount; it is only
 * ever recognized against the server's own configured Price IDs (see
 * `src/platform/stripe/env.ts`), which in turn come from trusted
 * environment variables, never from anything Stripe (or a client) sends us
 * as free-form text. Returns `null` for a Price ID that doesn't match
 * either configured plan — callers must treat that as "don't know", never
 * default it to a guessed plan.
 */
export function planFromPriceId(
  priceId: string,
  configuredPriceIds: { monthly: string; annual: string },
): BillingPlan | null {
  if (priceId === configuredPriceIds.monthly) {
    return "monthly";
  }
  if (priceId === configuredPriceIds.annual) {
    return "annual";
  }
  return null;
}
