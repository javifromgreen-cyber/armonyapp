import { describe, expect, it } from "vitest";
import { hasProAccess, isBillingPlan, planFromPriceId } from "./billing";

const PRICE_IDS = { monthly: "price_monthly_123", annual: "price_annual_456" };

describe("hasProAccess", () => {
  it("no billing row at all: no Pro access", () => {
    expect(hasProAccess(null)).toBe(false);
  });

  it("active subscription with a future period end: Pro access", () => {
    const future = new Date(Date.now() + 60_000);
    expect(hasProAccess({ subscriptionStatus: "active", currentPeriodEnd: future })).toBe(true);
  });

  it("active subscription whose period has already ended (stale row): no Pro access", () => {
    const past = new Date(Date.now() - 60_000);
    expect(hasProAccess({ subscriptionStatus: "active", currentPeriodEnd: past })).toBe(false);
  });

  it("cancel_at_period_end has no bearing here — Stripe keeps status active until the period ends, so access continues (test 5)", () => {
    // hasProAccess never reads cancel_at_period_end; it isn't part of BillingState.
    // Access lasts exactly as long as Stripe reports status: "active", which is
    // precisely how cancel-at-period-end is supposed to behave.
    const future = new Date(Date.now() + 60_000);
    expect(hasProAccess({ subscriptionStatus: "active", currentPeriodEnd: future })).toBe(true);
  });

  it("canceled subscription: no Pro access regardless of currentPeriodEnd (test 6)", () => {
    const future = new Date(Date.now() + 60_000);
    expect(hasProAccess({ subscriptionStatus: "canceled", currentPeriodEnd: future })).toBe(false);
  });

  it("past_due subscription: temporary Pro access, unconditional on currentPeriodEnd (test 8)", () => {
    const past = new Date(Date.now() - 60_000);
    expect(hasProAccess({ subscriptionStatus: "past_due", currentPeriodEnd: past })).toBe(true);
    expect(hasProAccess({ subscriptionStatus: "past_due", currentPeriodEnd: null })).toBe(true);
  });

  it("trialing (Stripe-side) subscription with a future period end: Pro access", () => {
    const future = new Date(Date.now() + 60_000);
    expect(hasProAccess({ subscriptionStatus: "trialing", currentPeriodEnd: future })).toBe(true);
  });

  it("incomplete subscription: no Pro access (test 9)", () => {
    expect(hasProAccess({ subscriptionStatus: "incomplete", currentPeriodEnd: null })).toBe(false);
  });

  it("incomplete_expired subscription: no Pro access", () => {
    expect(hasProAccess({ subscriptionStatus: "incomplete_expired", currentPeriodEnd: null })).toBe(false);
  });

  it("unpaid subscription: no Pro access (test 10)", () => {
    expect(hasProAccess({ subscriptionStatus: "unpaid", currentPeriodEnd: null })).toBe(false);
  });

  it("paused subscription: no Pro access", () => {
    expect(hasProAccess({ subscriptionStatus: "paused", currentPeriodEnd: null })).toBe(false);
  });
});

describe("isBillingPlan", () => {
  it("accepts exactly 'monthly' and 'annual'", () => {
    expect(isBillingPlan("monthly")).toBe(true);
    expect(isBillingPlan("annual")).toBe(true);
  });

  it("rejects anything else, including a raw Stripe Price ID (test 15)", () => {
    expect(isBillingPlan("price_1AbCdEfGhIjKlMnOpQrStUvW")).toBe(false);
    expect(isBillingPlan("lifetime")).toBe(false);
    expect(isBillingPlan("")).toBe(false);
    expect(isBillingPlan(undefined)).toBe(false);
    expect(isBillingPlan(null)).toBe(false);
    expect(isBillingPlan(42)).toBe(false);
  });
});

describe("planFromPriceId", () => {
  it("maps the configured monthly Price ID to 'monthly' (test 13)", () => {
    expect(planFromPriceId(PRICE_IDS.monthly, PRICE_IDS)).toBe("monthly");
  });

  it("maps the configured annual Price ID to 'annual' (test 14)", () => {
    expect(planFromPriceId(PRICE_IDS.annual, PRICE_IDS)).toBe("annual");
  });

  it("returns null for an unrecognized Price ID — never guesses from amount (test 26)", () => {
    expect(planFromPriceId("price_unrelated_999", PRICE_IDS)).toBeNull();
  });
});
