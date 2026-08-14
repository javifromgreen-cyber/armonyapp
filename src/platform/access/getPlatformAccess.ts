import { unstable_rethrow } from "next/navigation";
import { computeTrialEndsAt, computeTrialStatus, entitlementsFor, type Entitlements } from "@/domain/entitlements";
import { createSupabaseServerClient } from "../supabase/server";

export interface PlatformAccess {
  userId: string;
  email: string | null;
  trialStartedAt: Date;
  trialEndsAt: Date;
  entitlements: Entitlements;
}

interface PlatformAccessRow {
  trial_started_at: string;
  trial_ends_at: string;
}

/**
 * The single server-side entry point for "who is this and what can they
 * do" (product-spec.md — ONA Functional Phase 1). Returns `null` for an
 * unauthenticated visitor; every page/route that needs auth or access state
 * calls this ONE function rather than talking to Supabase directly.
 *
 * `getUser()` (not `getSession()`) revalidates the JWT with the auth
 * server — required for anything that gates access, per Supabase's own
 * guidance. Status is computed from the DB-stored `trial_ends_at` compared
 * against THIS server's clock (`computeTrialStatus`'s `now` default) —
 * never a client-supplied timestamp.
 *
 * Deliberately swallows any Supabase/env error and returns `null` instead —
 * e.g. `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` not
 * configured yet, or a
 * transient network failure. Every page that calls this treats `null` as
 * "signed out" and still renders (the public marketing shell, sign-in,
 * etc.); the alternative — letting this throw — would take the entire site
 * down (including `next build`'s prerendering) whenever Supabase isn't
 * reachable, which is worse than briefly showing the signed-out state. The
 * one place a Supabase misconfiguration DOES surface loudly is where a
 * visitor actually attempts to sign in (`SignInActions`'s browser client).
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

  const status = computeTrialStatus(trialEndsAt);

  return {
    userId: user.id,
    email: user.email ?? null,
    trialStartedAt,
    trialEndsAt,
    entitlements: entitlementsFor(status),
  };
}
