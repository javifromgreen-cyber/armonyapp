import { describe, expect, it } from "vitest";
import { decideAppAccess } from "./appAccess";
import { entitlementsFor } from "./entitlements";
import { computeTrialStatus } from "./trial";

describe("decideAppAccess", () => {
  it("C — unauthenticated visitor requires sign-in, carrying returnTo=/app", () => {
    expect(decideAppAccess(null, "/app")).toEqual({ kind: "requireSignIn", returnTo: "/app" });
  });

  it("A — trial in the future: allowed", () => {
    const trialEndsAt = new Date(Date.now() + 60_000);
    const status = computeTrialStatus(trialEndsAt);
    expect(status).toBe("trialing");
    expect(decideAppAccess(entitlementsFor(status), "/app")).toEqual({ kind: "allow" });
  });

  it("B — trial exactly at trial_ends_at: expired, denied", () => {
    const now = new Date("2026-08-17T00:00:00.000Z");
    const trialEndsAt = now;
    const status = computeTrialStatus(trialEndsAt, now);
    expect(status).toBe("expired");
    expect(decideAppAccess(entitlementsFor(status), "/app")).toEqual({ kind: "trialEnded" });
  });

  it("B — trial after trial_ends_at: expired, denied", () => {
    const trialEndsAt = new Date(Date.now() - 60_000);
    const status = computeTrialStatus(trialEndsAt);
    expect(status).toBe("expired");
    expect(decideAppAccess(entitlementsFor(status), "/app")).toEqual({ kind: "trialEnded" });
  });

  it("D — expired authenticated visitor is sent to Trial Ended, not sign-in", () => {
    const decision = decideAppAccess(entitlementsFor("expired"), "/app");
    expect(decision.kind).toBe("trialEnded");
    expect(decision).not.toHaveProperty("returnTo");
  });

  it("F — re-authenticating while expired changes nothing: still trialEnded", () => {
    // Signing in again doesn't touch trial_ends_at (the DB trigger only fires
    // once, on first account creation — see supabase/migrations/) so the
    // same expired entitlements object is what a repeat sign-in produces.
    const firstCheck = decideAppAccess(entitlementsFor("expired"), "/app");
    const afterSigningInAgain = decideAppAccess(entitlementsFor("expired"), "/app");
    expect(firstCheck).toEqual(afterSigningInAgain);
    expect(afterSigningInAgain).toEqual({ kind: "trialEnded" });
  });
});
