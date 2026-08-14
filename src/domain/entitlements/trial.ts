/**
 * The 72-hour full-platform trial (product-spec.md §19, CLAUDE.md's
 * commercial model) — framework-free, pure functions only. The actual
 * `trial_started_at`/`trial_ends_at` values are set exactly once, at the
 * database layer (see `supabase/migrations/`), never computed or trusted
 * from client input; this module only knows how to derive an end time and a
 * status from two already-trustworthy timestamps.
 */
export const TRIAL_DURATION_HOURS = 72;
const TRIAL_DURATION_MS = TRIAL_DURATION_HOURS * 60 * 60 * 1000;

/** Exactly 72 hours after `trialStartedAt` — matches the database trigger's own calculation. */
export function computeTrialEndsAt(trialStartedAt: Date): Date {
  return new Date(trialStartedAt.getTime() + TRIAL_DURATION_MS);
}

export type TrialStatus = "trialing" | "expired";

/**
 * `now` defaults to the current time but is an explicit parameter so tests
 * (and any future caller) never depend on real wall-clock time implicitly.
 * Callers must pass a trustworthy (server-derived) `now` — this function has
 * no way to enforce that itself, which is why `src/platform/access` never
 * accepts a client-supplied `now`.
 */
export function computeTrialStatus(trialEndsAt: Date, now: Date = new Date()): TrialStatus {
  return now.getTime() < trialEndsAt.getTime() ? "trialing" : "expired";
}
