import { describe, expect, it } from "vitest";
import { TRIAL_DURATION_HOURS, computeTrialEndsAt, computeTrialStatus } from "./trial";

describe("computeTrialEndsAt", () => {
  it("is exactly 72 hours after the start time", () => {
    expect(TRIAL_DURATION_HOURS).toBe(72);

    const start = new Date("2026-08-14T00:00:00.000Z");
    const end = computeTrialEndsAt(start);

    expect(end.getTime() - start.getTime()).toBe(72 * 60 * 60 * 1000);
    expect(end.toISOString()).toBe("2026-08-17T00:00:00.000Z");
  });
});

describe("computeTrialStatus", () => {
  const trialEndsAt = new Date("2026-08-17T00:00:00.000Z");

  it("is trialing before the end time", () => {
    const now = new Date(trialEndsAt.getTime() - 1000);
    expect(computeTrialStatus(trialEndsAt, now)).toBe("trialing");
  });

  it("is expired exactly at the end time (boundary is not trialing)", () => {
    expect(computeTrialStatus(trialEndsAt, trialEndsAt)).toBe("expired");
  });

  it("is expired after the end time", () => {
    const now = new Date(trialEndsAt.getTime() + 1000);
    expect(computeTrialStatus(trialEndsAt, now)).toBe("expired");
  });
});
