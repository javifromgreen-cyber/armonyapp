import { describe, expect, it } from "vitest";
import { computeOverallStatus } from "./overallStatus";
import { computeTrialStatus } from "./trial";
import { hasProAccess, type BillingState } from "./billing";
import { entitlementsFor } from "./entitlements";

const FUTURE = new Date(Date.now() + 60_000);
const PAST = new Date(Date.now() - 60_000);

/** End-to-end: trial timestamp + billing row -> overall status -> canUseApp, exactly as getPlatformAccess.ts wires it. */
function accessFor(trialEndsAt: Date, billing: BillingState | null) {
  const trialStatus = computeTrialStatus(trialEndsAt);
  const overallStatus = computeOverallStatus(trialStatus, hasProAccess(billing));
  return entitlementsFor(overallStatus);
}

describe("combined trial + Pro entitlement (product-spec.md §9)", () => {
  it("1 — active trial + no Pro: access", () => {
    expect(accessFor(FUTURE, null).canUseApp).toBe(true);
  });

  it("2 — expired trial + no Pro: denied", () => {
    expect(accessFor(PAST, null).canUseApp).toBe(false);
  });

  it("3 — expired trial + active Pro: access", () => {
    const billing: BillingState = { subscriptionStatus: "active", currentPeriodEnd: FUTURE };
    const access = accessFor(PAST, billing);
    expect(access.canUseApp).toBe(true);
    expect(access.status).toBe("active");
  });

  it("4 — active trial + active Pro: access", () => {
    const billing: BillingState = { subscriptionStatus: "active", currentPeriodEnd: FUTURE };
    expect(accessFor(FUTURE, billing).canUseApp).toBe(true);
  });

  it("5 — active Pro + cancel_at_period_end: access until period end (status stays active until then)", () => {
    // cancel_at_period_end itself isn't part of BillingState — Stripe keeps
    // status "active" for the whole paid period regardless, which is what
    // actually grants continued access here.
    const billing: BillingState = { subscriptionStatus: "active", currentPeriodEnd: FUTURE };
    expect(accessFor(PAST, billing).canUseApp).toBe(true);
  });

  it("6 — canceled subscription + expired trial: denied", () => {
    const billing: BillingState = { subscriptionStatus: "canceled", currentPeriodEnd: PAST };
    expect(accessFor(PAST, billing).canUseApp).toBe(false);
  });

  it("7 — canceled subscription + still-active original trial: access via trial", () => {
    const billing: BillingState = { subscriptionStatus: "canceled", currentPeriodEnd: PAST };
    const access = accessFor(FUTURE, billing);
    expect(access.canUseApp).toBe(true);
    expect(access.status).toBe("trialing");
  });

  it("8 — past_due subscription: temporary Pro access even with an expired trial", () => {
    const billing: BillingState = { subscriptionStatus: "past_due", currentPeriodEnd: PAST };
    const access = accessFor(PAST, billing);
    expect(access.canUseApp).toBe(true);
    expect(access.status).toBe("active");
  });

  it("9 — incomplete subscription: denied once trial has expired", () => {
    const billing: BillingState = { subscriptionStatus: "incomplete", currentPeriodEnd: null };
    expect(accessFor(PAST, billing).canUseApp).toBe(false);
  });

  it("9b — incomplete subscription: trial still covers access while it's active", () => {
    const billing: BillingState = { subscriptionStatus: "incomplete", currentPeriodEnd: null };
    expect(accessFor(FUTURE, billing).canUseApp).toBe(true);
  });

  it("10 — unpaid subscription: denied once trial has expired", () => {
    const billing: BillingState = { subscriptionStatus: "unpaid", currentPeriodEnd: null };
    expect(accessFor(PAST, billing).canUseApp).toBe(false);
  });

  it("paid period ending before the original trial's own end still falls back to the trial", () => {
    // "If somehow paid period ends before original 72-hour trial expiry,
    // entitlement falls back to trial until original trial_ends_at."
    const periodEndBeforeTrialEnds = new Date(Date.now() + 30_000);
    const trialEndsAt = new Date(Date.now() + 60_000);
    const billing: BillingState = { subscriptionStatus: "canceled", currentPeriodEnd: periodEndBeforeTrialEnds };
    const access = accessFor(trialEndsAt, billing);
    expect(access.canUseApp).toBe(true);
    expect(access.status).toBe("trialing");
  });
});
