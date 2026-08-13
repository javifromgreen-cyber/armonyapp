import { describe, expect, it } from "vitest";
import { DEFAULT_BPM } from "./progression";

describe("DEFAULT_BPM", () => {
  it("is the fixed 90 BPM reference used for Bass pattern step timing (Phase R3.4)", () => {
    expect(DEFAULT_BPM).toBe(90);
  });
});
