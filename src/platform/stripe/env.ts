import "server-only";
import type { BillingPlan } from "@/domain/entitlements";

/**
 * The single place Stripe-related env vars are read from (ONA Functional
 * Phase 2) — mirrors `src/platform/supabase/env.ts`'s pattern so every
 * Stripe-touching module fails the same way if a variable is missing,
 * instead of each call site expecting a slightly different name.
 * `import "server-only"` makes any accidental client-bundle import of this
 * module a build-time error rather than a silent runtime surprise.
 */
export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. See docs/stripe-billing-setup.md for how to configure Stripe.",
    );
  }
  return key;
}

const PRICE_ID_ENV_VAR: Record<BillingPlan, string> = {
  monthly: "STRIPE_PRICE_ID_PRO_MONTHLY",
  annual: "STRIPE_PRICE_ID_PRO_ANNUAL",
};

/**
 * Resolves a TRUSTED plan identifier (never client-supplied text) to its
 * configured Stripe Price ID. This is the only path from "monthly"/"annual"
 * to an actual Price ID anywhere in the app — the client is never allowed
 * to submit a raw Price ID (see `src/app/api/stripe/checkout/route.ts`).
 */
export function getStripePriceId(plan: BillingPlan): string {
  const envVar = PRICE_ID_ENV_VAR[plan];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`Missing ${envVar}. See docs/stripe-billing-setup.md for how to configure Stripe.`);
  }
  return priceId;
}

/** Both configured Price IDs, for mapping a Price ID back to a plan (webhook sync) — see `planFromPriceId`. */
export function getConfiguredStripePriceIds(): { monthly: string; annual: string } {
  return { monthly: getStripePriceId("monthly"), annual: getStripePriceId("annual") };
}

/**
 * Deliberately separate from the getters above: `STRIPE_WEBHOOK_SECRET`
 * does not exist yet (the Stripe webhook endpoint must be deployed before
 * its signing secret can be created in the Stripe Dashboard — see
 * docs/stripe-billing-setup.md). Checkout must work without it; only the
 * webhook route calls this, and it fails closed (a safe 503, never
 * unverified processing) when it's missing.
 */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Missing STRIPE_WEBHOOK_SECRET. The Stripe webhook endpoint has not been configured yet — see docs/stripe-billing-setup.md.",
    );
  }
  return secret;
}
