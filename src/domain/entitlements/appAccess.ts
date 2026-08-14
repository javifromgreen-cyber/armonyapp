import type { Entitlements } from "./types";

/**
 * The `/app` route-protection decision (ONA Functional Phase 1 hardening
 * pass) — pure so the three real-world cases (signed out, expired,
 * allowed) are unit-testable without mocking Next.js/Supabase. The actual
 * redirect wiring stays in `src/app/[locale]/app/page.tsx`; this function
 * only decides WHAT should happen, never performs the redirect itself.
 */
export type AppAccessDecision =
  | { kind: "allow" }
  | { kind: "requireSignIn"; returnTo: string }
  | { kind: "trialEnded" };

export function decideAppAccess(
  entitlements: Entitlements | null,
  returnTo: string,
): AppAccessDecision {
  if (!entitlements) {
    return { kind: "requireSignIn", returnTo };
  }
  if (!entitlements.canUseApp) {
    return { kind: "trialEnded" };
  }
  return { kind: "allow" };
}
