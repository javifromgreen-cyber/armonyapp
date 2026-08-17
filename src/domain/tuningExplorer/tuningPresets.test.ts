import { describe, expect, it } from "vitest";
import {
  TUNING_PRESETS,
  presetsFor,
  familiesFor,
  defaultPresetFor,
  type TuningPreset,
} from "./tuningPresets";
import { midiFromPitchClassAndOctave } from "../instruments/playablePitch";
import { noteToPitchClass, parseNoteName } from "../notes";

function midi(spec: string): number {
  const match = /^([A-G][#b]{0,2})(-?\d+)$/.exec(spec)!;
  return midiFromPitchClassAndOctave(noteToPitchClass(parseNoteName(match[1])), Number(match[2]));
}

function findPreset(instrument: TuningPreset["instrument"], stringCount: number, name: string): TuningPreset {
  const preset = TUNING_PRESETS.find(
    (p) => p.instrument === instrument && p.stringCount === stringCount && p.name === name,
  );
  if (!preset) throw new Error(`Preset not found: ${instrument}/${stringCount}/${name}`);
  return preset;
}

describe("tuning preset data (module load)", () => {
  it("every preset's open-string count matches its declared string count", () => {
    for (const preset of TUNING_PRESETS) {
      expect(preset.openStringsMidi.length).toBe(preset.stringCount);
    }
  });

  it("has no duplicate preset names within the same instrument/string-count", () => {
    const seen = new Set<string>();
    for (const preset of TUNING_PRESETS) {
      const key = `${preset.instrument}-${preset.stringCount}-${preset.name}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("has no duplicate ids", () => {
    const ids = TUNING_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("curated preset correctness (product spec §7)", () => {
  it("9 — Drop D 6-string electric guitar is correct", () => {
    const preset = findPreset("electricGuitar", 6, "Drop D");
    expect(preset.openStringsMidi).toEqual(["D2", "A2", "D3", "G3", "B3", "E4"].map(midi));
  });

  it("10 — Drop C 6-string electric guitar is C2 G2 C3 F3 A3 D4", () => {
    const preset = findPreset("electricGuitar", 6, "Drop C");
    expect(preset.openStringsMidi).toEqual(["C2", "G2", "C3", "F3", "A3", "D4"].map(midi));
  });

  it("11 — Drop A 7-string electric guitar is correct", () => {
    const preset = findPreset("electricGuitar", 7, "Drop A");
    expect(preset.openStringsMidi).toEqual(["A1", "E2", "A2", "D3", "G3", "B3", "E4"].map(midi));
  });

  it("12 — B Standard 7-string electric guitar is correct", () => {
    const preset = findPreset("electricGuitar", 7, "B Standard");
    expect(preset.openStringsMidi).toEqual(["B1", "E2", "A2", "D3", "G3", "B3", "E4"].map(midi));
  });

  it("13 — DADGAD is correct (electric and acoustic 6-string)", () => {
    const expected = ["D2", "A2", "D3", "G3", "A3", "D4"].map(midi);
    expect(findPreset("electricGuitar", 6, "DADGAD").openStringsMidi).toEqual(expected);
    expect(findPreset("acousticGuitar", 6, "DADGAD").openStringsMidi).toEqual(expected);
  });

  it("14 — B Standard bass 5-string is correct", () => {
    const preset = findPreset("bass", 5, "B Standard");
    expect(preset.openStringsMidi).toEqual(["B0", "E1", "A1", "D2", "G2"].map(midi));
  });

  it("15 — very low presets (Drop F / Drop E) resolve to correct MIDI values", () => {
    expect(findPreset("electricGuitar", 6, "Drop F").openStringsMidi).toEqual(
      ["F1", "C2", "F2", "Bb2", "D3", "G3"].map(midi),
    );
    expect(findPreset("bass", 5, "Drop E").openStringsMidi).toEqual(
      ["E0", "B0", "E1", "A1", "D2"].map(midi),
    );
    expect(findPreset("bass", 4, "Drop F").openStringsMidi).toEqual(["F0", "C1", "F1", "Bb1"].map(midi));
  });
});

describe("presetsFor / familiesFor / defaultPresetFor", () => {
  it("presetsFor scopes strictly to instrument + string count", () => {
    for (const preset of presetsFor("electricGuitar", 6)) {
      expect(preset.instrument).toBe("electricGuitar");
      expect(preset.stringCount).toBe(6);
    }
  });

  it("familiesFor never invents Open/Alternate for 7-string electric guitar (no such presets exist)", () => {
    expect(familiesFor("electricGuitar", 7)).toEqual(["standard", "drop", "custom"]);
  });

  it("familiesFor always appends 'custom' last", () => {
    for (const [instrument, stringCount] of [
      ["electricGuitar", 6],
      ["electricGuitar", 7],
      ["acousticGuitar", 6],
      ["bass", 4],
      ["bass", 5],
    ] as const) {
      const families = familiesFor(instrument, stringCount);
      expect(families[families.length - 1]).toBe("custom");
    }
  });

  it("23 — defaultPresetFor electricGuitar/7 resolves to B Standard", () => {
    expect(defaultPresetFor("electricGuitar", 7).name).toBe("B Standard");
  });

  it("24 — defaultPresetFor acousticGuitar/6 resolves to E Standard", () => {
    expect(defaultPresetFor("acousticGuitar", 6).name).toBe("E Standard");
  });

  it("25 — defaultPresetFor bass/5 resolves to B Standard", () => {
    expect(defaultPresetFor("bass", 5).name).toBe("B Standard");
  });

  it("defaultPresetFor bass/4 and electricGuitar/6 resolve to E Standard", () => {
    expect(defaultPresetFor("bass", 4).name).toBe("E Standard");
    expect(defaultPresetFor("electricGuitar", 6).name).toBe("E Standard");
  });
});
