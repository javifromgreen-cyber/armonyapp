import { describe, expect, it } from "vitest";
import { resolveInstrumentChange, resolveStringCountChange } from "./stateTransitions";

describe("state transitions (product spec §24)", () => {
  it("23 — switching to Electric Guitar 7 strings resolves to B Standard", () => {
    const result = resolveStringCountChange("electricGuitar", 7);
    expect(result).toEqual({
      instrument: "electricGuitar",
      stringCount: 7,
      preset: expect.objectContaining({ name: "B Standard", stringCount: 7 }),
    });
  });

  it("24 — switching to Acoustic Guitar resolves to E Standard 6 strings (Acoustic has no 7-string option)", () => {
    const result = resolveInstrumentChange("acousticGuitar", 7);
    expect(result.instrument).toBe("acousticGuitar");
    expect(result.stringCount).toBe(6);
    expect(result.preset.name).toBe("E Standard");
  });

  it("25 — switching Bass 4 -> Bass 5 resolves safely to B Standard", () => {
    const result = resolveStringCountChange("bass", 5);
    expect(result.stringCount).toBe(5);
    expect(result.preset.name).toBe("B Standard");
  });

  it("instrument change keeps a still-valid string count instead of resetting it", () => {
    // Electric Guitar 7-string -> still Electric Guitar (no-op-ish instrument
    // change) keeps 7 strings, since 7 is valid for electricGuitar.
    const result = resolveInstrumentChange("electricGuitar", 7);
    expect(result.stringCount).toBe(7);
    expect(result.preset.name).toBe("B Standard");
  });

  it("instrument change resets an invalid string count to that instrument's default", () => {
    // Bass has no 6-string option -> resets to bass's default (4).
    const result = resolveInstrumentChange("bass", 6);
    expect(result.stringCount).toBe(4);
    expect(result.preset.name).toBe("E Standard");
  });
});
