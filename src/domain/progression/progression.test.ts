import { describe, expect, it } from "vitest";
import { clampBpm, DEFAULT_BPM, DEFAULT_DURATION_BEATS, DEFAULT_TIME_SIGNATURE, MAX_BPM, MIN_BPM } from "./progression";

describe("defaults", () => {
  it("documented default values", () => {
    expect(DEFAULT_BPM).toBe(90);
    expect(DEFAULT_TIME_SIGNATURE).toBe("4/4");
    expect(DEFAULT_DURATION_BEATS).toBe(4);
  });
});

describe("clampBpm", () => {
  it("clamps to [MIN_BPM, MAX_BPM]", () => {
    expect(clampBpm(5)).toBe(MIN_BPM);
    expect(clampBpm(5000)).toBe(MAX_BPM);
    expect(clampBpm(120)).toBe(120);
  });

  it("rounds fractional input", () => {
    expect(clampBpm(90.6)).toBe(91);
  });
});
