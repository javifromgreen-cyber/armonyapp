import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `env.ts` imports "server-only" to guard against an accidental
// client-bundle import in production — that package unconditionally throws
// under plain Node module resolution (only bundlers configured for the
// "react-server" condition alias it to a no-op), which is exactly what
// Vitest uses. Stubbing it here is the standard way to unit test a
// server-only-guarded module without weakening the guard itself.
vi.mock("server-only", () => ({}));

const { getStripeSecretKey, getStripePriceId, getConfiguredStripePriceIds, getStripeWebhookSecret } =
  await import("./env");

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
  delete process.env.STRIPE_PRICE_ID_PRO_ANNUAL;
  delete process.env.STRIPE_WEBHOOK_SECRET;
}

describe("Stripe env config", () => {
  beforeEach(resetEnv);
  afterEach(() => {
    resetEnv();
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("getStripeSecretKey throws a clear error when missing", () => {
    expect(() => getStripeSecretKey()).toThrow("STRIPE_SECRET_KEY");
  });

  it("getStripeSecretKey returns the configured key", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    expect(getStripeSecretKey()).toBe("sk_test_example");
  });

  it("getStripePriceId resolves 'monthly' to STRIPE_PRICE_ID_PRO_MONTHLY only (test 13)", () => {
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY = "price_monthly_abc";
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL = "price_annual_xyz";
    expect(getStripePriceId("monthly")).toBe("price_monthly_abc");
  });

  it("getStripePriceId resolves 'annual' to STRIPE_PRICE_ID_PRO_ANNUAL only (test 14)", () => {
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY = "price_monthly_abc";
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL = "price_annual_xyz";
    expect(getStripePriceId("annual")).toBe("price_annual_xyz");
  });

  it("getStripePriceId throws a clear error naming the missing env var", () => {
    expect(() => getStripePriceId("monthly")).toThrow("STRIPE_PRICE_ID_PRO_MONTHLY");
    expect(() => getStripePriceId("annual")).toThrow("STRIPE_PRICE_ID_PRO_ANNUAL");
  });

  it("getConfiguredStripePriceIds returns both configured Price IDs together", () => {
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY = "price_monthly_abc";
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL = "price_annual_xyz";
    expect(getConfiguredStripePriceIds()).toEqual({
      monthly: "price_monthly_abc",
      annual: "price_annual_xyz",
    });
  });

  it("getStripeWebhookSecret throws when STRIPE_WEBHOOK_SECRET is not yet configured (test 20)", () => {
    expect(() => getStripeWebhookSecret()).toThrow("STRIPE_WEBHOOK_SECRET");
  });

  it("getStripeWebhookSecret returns the configured secret once set", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
    expect(getStripeWebhookSecret()).toBe("whsec_example");
  });
});
