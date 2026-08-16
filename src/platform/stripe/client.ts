import "server-only";
import Stripe from "stripe";
import { getStripeSecretKey } from "./env";

/**
 * Pinned to the `stripe@22.5.0` package's own compiled default API version
 * (`node_modules/stripe/cjs/apiVersion.js`) — this is the first stable
 * ("dahlia") version line that supports Managed Payments' `managed_payments`
 * Checkout Session parameter (added in `stripe-node` 22.1.0, which moved the
 * pinned version to `2026-04-22.dahlia`; 22.5.0 carries it forward to
 * `2026-07-29.dahlia`). Pinned explicitly, not left to the SDK's implicit
 * default, so a future `npm install stripe@latest` that bumps this value is
 * a visible, reviewed TypeScript error here (the config type is a literal
 * matching the installed package's exact default) rather than a silent
 * behavior change.
 */
const STRIPE_API_VERSION = "2026-07-29.dahlia";

let stripeClient: Stripe | undefined;

/**
 * The single server-only Stripe client factory (ONA Functional Phase 2) —
 * every route/module that talks to Stripe goes through this, never
 * constructs its own `new Stripe(...)`. `import "server-only"` (both here
 * and in `./env.ts`) turns an accidental client-bundle import into a
 * build-time error.
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeClient;
}
