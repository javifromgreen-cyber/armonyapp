import type { TrialStatus } from "./trial";
import type { EntitlementStatus } from "./types";

/**
 * The entire "trial and Pro are independent" rule (CLAUDE.md's commercial
 * model, product-spec.md §9) in one place: Pro access (already fully
 * resolved by `hasProAccess`) always wins when present; otherwise the
 * account falls back to its own 72-hour trial's status. Trial timestamps
 * are never touched by billing events (see `supabase/migrations/` — the
 * trial trigger and the billing sync are separate tables written by
 * separate code paths), so this OR is sufficient on its own to produce
 * every combination product-spec.md §9 describes: Pro overrides an expired
 * trial; a canceled subscription falls back to a still-active original
 * trial; once neither grants access, the account is `"expired"`.
 */
export function computeOverallStatus(trialStatus: TrialStatus, hasProAccess: boolean): EntitlementStatus {
  return hasProAccess ? "active" : trialStatus;
}
