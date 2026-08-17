import { describe, expect, it } from "vitest";
import {
  tuningExplorerReducer,
  initialTuningExplorerState,
  currentOpenStringsMidi,
  currentPresetName,
} from "./tuningExplorerState";
import { presetsFor } from "@/domain/tuningExplorer";

describe("initialTuningExplorerState", () => {
  it("opens ready-to-use: Electric Guitar, 6 strings, E Standard, sharps", () => {
    const state = initialTuningExplorerState();
    expect(state.instrument).toBe("electricGuitar");
    expect(state.stringCount).toBe(6);
    expect(state.family).toBe("standard");
    expect(currentPresetName(state)).toBe("E Standard");
    expect(state.notation).toBe("sharp");
  });
});

describe("tuningExplorerReducer", () => {
  it("SET_INSTRUMENT resets to that instrument's default standard tuning", () => {
    const state = initialTuningExplorerState();
    const next = tuningExplorerReducer(state, { type: "SET_INSTRUMENT", instrument: "bass" });
    expect(next.instrument).toBe("bass");
    expect(next.stringCount).toBe(4);
    expect(currentPresetName(next)).toBe("E Standard");
  });

  it("SET_STRING_COUNT resets to that configuration's default standard tuning", () => {
    const state = initialTuningExplorerState();
    const next = tuningExplorerReducer(state, { type: "SET_STRING_COUNT", stringCount: 7 });
    expect(next.stringCount).toBe(7);
    expect(currentPresetName(next)).toBe("B Standard");
  });

  it("SET_PRESET switches to the exact selected preset", () => {
    const state = initialTuningExplorerState();
    const dropC = presetsFor("electricGuitar", 6).find((p) => p.name === "Drop C")!;
    const next = tuningExplorerReducer(state, { type: "SET_PRESET", presetId: dropC.id });
    expect(next.family).toBe("drop");
    expect(currentPresetName(next)).toBe("Drop C");
    expect(currentOpenStringsMidi(next)).toEqual(dropC.openStringsMidi);
  });

  it("SET_FAMILY('custom') seeds the custom tuning from the currently active tuning", () => {
    const state = initialTuningExplorerState();
    const beforeMidi = currentOpenStringsMidi(state);
    const next = tuningExplorerReducer(state, { type: "SET_FAMILY", family: "custom" });
    expect(next.family).toBe("custom");
    expect(currentPresetName(next)).toBeNull();
    expect(currentOpenStringsMidi(next)).toEqual(beforeMidi);
  });

  it("SET_FAMILY(other) picks the first preset in that family", () => {
    const state = initialTuningExplorerState();
    const next = tuningExplorerReducer(state, { type: "SET_FAMILY", family: "drop" });
    expect(next.family).toBe("drop");
    expect(currentPresetName(next)).toBe("Drop D"); // first "drop" entry for electricGuitar/6
  });

  it("SET_CUSTOM_STRING changes only the targeted string and instantly rebuilds the derived tuning", () => {
    let state = tuningExplorerReducer(initialTuningExplorerState(), { type: "SET_FAMILY", family: "custom" });
    const before = [...currentOpenStringsMidi(state)];
    state = tuningExplorerReducer(state, { type: "SET_CUSTOM_STRING", stringIndex: 0, pitchClass: 0 }); // -> C near low E
    const after = currentOpenStringsMidi(state);
    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
  });

  it("SET_CUSTOM_STRING while not already in 'custom' family switches to custom and seeds from the current tuning first", () => {
    const state = initialTuningExplorerState(); // family = "standard"
    const before = currentOpenStringsMidi(state);
    const next = tuningExplorerReducer(state, { type: "SET_CUSTOM_STRING", stringIndex: 5, pitchClass: 0 });
    expect(next.family).toBe("custom");
    expect(currentOpenStringsMidi(next).slice(0, 5)).toEqual(before.slice(0, 5));
    expect(currentOpenStringsMidi(next)[5]).not.toBe(before[5]);
  });

  it("22 — RESET_TO_STANDARD returns the correct standard tuning for every instrument/string-count configuration", () => {
    const configs: Array<[state: ReturnType<typeof initialTuningExplorerState>["instrument"], count: 4 | 5 | 6 | 7]> = [
      ["electricGuitar", 6],
      ["electricGuitar", 7],
      ["acousticGuitar", 6],
      ["bass", 4],
      ["bass", 5],
    ];
    for (const [instrument, stringCount] of configs) {
      let state = tuningExplorerReducer(initialTuningExplorerState(), { type: "SET_INSTRUMENT", instrument });
      state = tuningExplorerReducer(state, { type: "SET_STRING_COUNT", stringCount });
      state = tuningExplorerReducer(state, { type: "SET_FAMILY", family: "custom" });
      state = tuningExplorerReducer(state, { type: "SET_CUSTOM_STRING", stringIndex: 0, pitchClass: 3 });
      expect(state.family).toBe("custom");

      const reset = tuningExplorerReducer(state, { type: "RESET_TO_STANDARD" });
      expect(reset.family).toBe("standard");
      expect(currentOpenStringsMidi(reset)).toEqual(
        presetsFor(instrument, stringCount).find((p) => p.family === "standard")!.openStringsMidi,
      );
    }
  });

  it("SET_NOTATION toggles sharp/flat", () => {
    const state = initialTuningExplorerState();
    const next = tuningExplorerReducer(state, { type: "SET_NOTATION", notation: "flat" });
    expect(next.notation).toBe("flat");
  });
});
