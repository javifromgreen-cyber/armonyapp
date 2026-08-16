/**
 * Platform-wide entitlement status (docs/architecture.md "Entitlements",
 * CLAUDE.md's commercial-model rules) — never a per-app flag. This is the
 * OVERALL tri-state platform access result, not a raw Stripe subscription
 * status — those are a richer, separate vocabulary (see
 * `StripeSubscriptionStatus` in `./billing.ts`) that `hasProAccess` folds
 * down into whether `"active"` applies here. `"active"` means the account
 * currently has Pro access, whether via an active/trialing/past_due Stripe
 * subscription — see `./billing.ts` for exactly which raw statuses qualify
 * and why (e.g. `past_due` still grants access while Stripe retries
 * payment, `canceled` never does).
 */
export type EntitlementStatus = "trialing" | "active" | "expired";

export interface Entitlements {
  status: EntitlementStatus;
  /** Full harmonic navigation, all Zoom depths, complete instrument catalogues. */
  canUseApp: boolean;
  canSaveProjects: boolean;
  canExport: boolean;
}
