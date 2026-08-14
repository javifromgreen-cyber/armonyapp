/**
 * Platform-wide entitlement status (docs/architecture.md "Entitlements",
 * CLAUDE.md's commercial-model rules) — never a per-app flag. ONA Functional
 * Phase 1 only ever produces `"trialing"` or `"expired"`; `"active"` and the
 * reserved `"past_due"`/`"canceled"` states exist here so the billing phase
 * can extend this module without redesigning it, but nothing in this phase
 * computes or fakes them.
 */
export type EntitlementStatus = "trialing" | "active" | "expired" | "past_due" | "canceled";

export interface Entitlements {
  status: EntitlementStatus;
  /** Full harmonic navigation, all Zoom depths, complete instrument catalogues. */
  canUseApp: boolean;
  canSaveProjects: boolean;
  canExport: boolean;
}
