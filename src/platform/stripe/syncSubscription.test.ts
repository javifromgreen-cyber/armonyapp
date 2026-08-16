import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseStripeSubscriptionStatus } = await import("./syncSubscription");

describe("parseStripeSubscriptionStatus", () => {
  it("recognizes every known Stripe subscription status", () => {
    const known = [
      "active",
      "trialing",
      "past_due",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "unpaid",
      "paused",
    ] as const;
    for (const status of known) {
      expect(parseStripeSubscriptionStatus(status)).toBe(status);
    }
  });

  it("returns null for a status this app doesn't recognize, rather than guessing", () => {
    expect(parseStripeSubscriptionStatus("some_future_stripe_status")).toBeNull();
  });
});
