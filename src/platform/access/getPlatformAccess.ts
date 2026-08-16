import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeOverallStatus,
  computeTrialEndsAt,
  computeTrialStatus,
  entitlementsFor,
  hasProAccess,
  type BillingPlan,
  type Entitlements,
  type StripeSubscriptionStatus,
} from "@/domain/entitlements";
import { createSupabaseServerClient } from "../supabase/server";

export interface BillingSnapshot {
  plan: BillingPlan | null;
  subscriptionStatus: StripeSubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** Precomputed via `hasProAccess` — callers never need to re-derive this. */
  hasProAccess: boolean;
}

export interface PlatformAccess {
  userId: string;
  email: string | null;
  trialStartedAt: Date;
  trialEndsAt: Date;
  /** `null` = this account has never started Stripe checkout — not an error. */
  billing: BillingSnapshot | null;
  entitlements: Entitlements;
}

interface PlatformAccessRow {
  trial_started_at: string;
  trial_ends_at: string;
}

interface PlatformBillingRow {
  plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/**
 * The single server-side entry point for "who is this and what can they
 * do" (product-spec.md — ONA Functional Phase 1, extended in Phase 2 with
 * Stripe Pro). Returns `null` for an unauthenticated visitor; every
 * page/route that needs auth or access state calls this ONE function
 * rather than talking to Supabase directly.
 *
 * `getUser()` (not `getSession()`) revalidates the JWT with the auth
 * server — required for anything that gates access, per Supabase's own
 * guidance. The overall `entitlements.status` is `"active"` (Pro access)
 * whenever `hasProAccess` says so from the stored billing row; otherwise it
 * falls back to the 72-hour trial's own `"trialing"`/`"expired"` status —
 * this OR is the entire "trial independent of Pro" rule from
 * `CLAUDE.md`/product-spec.md §9: a canceled subscription never restarts or
 * extends the original trial, and an still-active original trial keeps
 * working even after Pro ends. Every comparison uses THIS server's clock
 * (`computeTrialStatus`/`hasProAccess`'s `now` defaults) — never a
 * client-supplied timestamp.
 *
 * Deliberately swallows any Supabase/env error and returns `null` instead —
 * e.g. required env vars not configured yet, or a transient network
 * failure. Every page that calls this treats `null` as "signed out" and
 * still renders (the public marketing shell, sign-in, etc.); the
 * alternative — letting this throw — would take the entire site down
 * (including `next build`'s prerendering) whenever Supabase isn't
 * reachable, which is worse than briefly showing the signed-out state. The
 * one place a Supabase misconfiguration DOES surface loudly is where a
 * visitor actually attempts to sign in (`SignInActions`'s browser client).
 * The `platform_billing` lookup has its OWN, separate error handling (see
 * `fetchBillingSnapshot` below) — a billing-table failure (including the
 * Phase 2 migration not having been applied yet in a given environment)
 * must fail closed for Pro WITHOUT taking down the trial-based access this
 * account may still legitimately have.
 *
 * `unstable_rethrow` lets Next's own internal control-flow signals (the
 * dynamic-rendering bailout thrown when `cookies()` is read during static
 * generation, plus `redirect()`/`notFound()`) pass straight through — only
 * a GENUINE Supabase/env failure is caught and turned into `null` below.
 */
export async function getPlatformAccess(): Promise<PlatformAccess | null> {
  try {
    return await fetchPlatformAccess();
  } catch (error) {
    unstable_rethrow(error);
    console.error("getPlatformAccess failed; treating visitor as signed out.", error);
    return null;
  }
}

async function fetchPlatformAccess(): Promise<PlatformAccess | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: row } = await supabase
    .from("platform_access")
    .select("trial_started_at, trial_ends_at")
    .eq("user_id", user.id)
    .maybeSingle<PlatformAccessRow>();

  // The DB trigger (supabase/migrations/) creates this row atomically with
  // the auth user, so a missing row is unexpected — treat it as "just
  // started a trial right now" rather than throwing, since this is a read
  // path that must never hard-fail the page for a genuinely signed-in user.
  const trialStartedAt = row ? new Date(row.trial_started_at) : new Date();
  const trialEndsAt = row ? new Date(row.trial_ends_at) : computeTrialEndsAt(trialStartedAt);
  const trialStatus = computeTrialStatus(trialEndsAt);

  const billing = await fetchBillingSnapshot(supabase, user.id);
  const overallStatus = computeOverallStatus(trialStatus, billing?.hasProAccess ?? false);

  return {
    userId: user.id,
    email: user.email ?? null,
    trialStartedAt,
    trialEndsAt,
    billing,
    entitlements: entitlementsFor(overallStatus),
  };
}

/**
 * Isolated from `fetchPlatformAccess`'s own error handling on purpose: this
 * NEVER throws. A failure here (including "relation platform_billing does
 * not exist" — the Phase 2 migration not applied yet in some environment)
 * degrades to `null` (no Pro access), logged server-side, while the
 * caller's trial-based access keeps working normally. Never grants Pro on
 * a read failure — the fail-closed direction is the only safe one for paid
 * access.
 */
async function fetchBillingSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<BillingSnapshot | null> {
  try {
    const { data: row, error } = await supabase
      .from("platform_billing")
      .select("plan, subscription_status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .maybeSingle<PlatformBillingRow>();

    if (error) {
      console.error("Failed to read platform_billing; treating as no Pro access.", error.message);
      return null;
    }
    if (!row) {
      return null;
    }

    const subscriptionStatus = row.subscription_status as StripeSubscriptionStatus | null;
    const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;

    return {
      plan: row.plan as BillingPlan | null,
      subscriptionStatus,
      currentPeriodEnd,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      hasProAccess: hasProAccess({ subscriptionStatus, currentPeriodEnd }),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("platform_billing lookup threw; treating as no Pro access.", error);
    return null;
  }
}
