import { parseNoteName, noteToPitchClass } from "../notes";
import { midiFromPitchClassAndOctave } from "../instruments/playablePitch";
import type { StringCount, TuningExplorerInstrument, TuningFamily } from "./types";

/**
 * The v1 curated tuning library (product spec §7) — data-driven, never
 * duplicated logic per preset. Each open string is stored as a real MIDI
 * pitch, computed once here from a compact "NoteOctave" spec string (e.g.
 * "Eb2") via the shared `src/domain/notes` parser — never stored as a
 * literal `Note` (letter+accidental): DISPLAY spelling is a separate
 * concern (`noteForPitchClass` + the global sharp/flat toggle, see
 * `fretboard.ts`), so a preset's exact source spelling (e.g. "C#" vs "Db")
 * only ever affects which MIDI pitch gets computed, never what's shown —
 * sharp/flat presets that happen to be enharmonically identical MIDI-wise
 * would render identically once display-spelled anyway.
 */
export interface TuningPreset {
  id: string;
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  family: Exclude<TuningFamily, "custom">;
  /** Canonical display name (e.g. "Drop C", "DADGAD") — never translated (product spec §10/§23). */
  name: string;
  /** Open-string MIDI pitches, LOW STRING -> HIGH STRING (product spec §7's canonical storage order). */
  openStringsMidi: readonly number[];
}

/** Parses a compact pitch spec like "Eb2", "C#4", "B0" into a MIDI number. */
function midiFromSpec(spec: string): number {
  const match = /^([A-G][#b]{0,2})(-?\d+)$/.exec(spec);
  if (!match) {
    throw new Error(`Invalid tuning pitch spec: "${spec}"`);
  }
  const note = parseNoteName(match[1]);
  const octave = Number(match[2]);
  return midiFromPitchClassAndOctave(noteToPitchClass(note), octave);
}

interface PresetSpec {
  family: Exclude<TuningFamily, "custom">;
  name: string;
  /** Low string -> high string, e.g. ["E2","A2","D3","G3","B3","E4"]. */
  notes: readonly string[];
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPresets(
  instrument: TuningExplorerInstrument,
  stringCount: StringCount,
  specs: readonly PresetSpec[],
): TuningPreset[] {
  return specs.map((spec) => {
    if (spec.notes.length !== stringCount) {
      throw new Error(
        `Preset "${spec.name}" for ${instrument}/${stringCount} has ${spec.notes.length} notes, expected ${stringCount}.`,
      );
    }
    return {
      id: `${instrument}-${stringCount}-${slug(spec.name)}`,
      instrument,
      stringCount,
      family: spec.family,
      name: spec.name,
      openStringsMidi: spec.notes.map(midiFromSpec),
    };
  });
}

const ELECTRIC_GUITAR_6: PresetSpec[] = [
  { family: "standard", name: "E Standard", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "standard", name: "Eb Standard", notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { family: "standard", name: "D Standard", notes: ["D2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "standard", name: "C# Standard", notes: ["C#2", "F#2", "B2", "E3", "G#3", "C#4"] },
  { family: "standard", name: "C Standard", notes: ["C2", "F2", "Bb2", "Eb3", "G3", "C4"] },
  { family: "standard", name: "B Standard", notes: ["B1", "E2", "A2", "D3", "F#3", "B3"] },
  { family: "standard", name: "Bb Standard", notes: ["Bb1", "Eb2", "Ab2", "Db3", "F3", "Bb3"] },
  { family: "standard", name: "A Standard", notes: ["A1", "D2", "G2", "C3", "E3", "A3"] },
  { family: "drop", name: "Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "drop", name: "Drop C#", notes: ["C#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
  { family: "drop", name: "Drop C", notes: ["C2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "drop", name: "Drop B", notes: ["B1", "F#2", "B2", "E3", "G#3", "C#4"] },
  { family: "drop", name: "Drop Bb", notes: ["Bb1", "F2", "Bb2", "Eb3", "G3", "C4"] },
  { family: "drop", name: "Drop A", notes: ["A1", "E2", "A2", "D3", "F#3", "B3"] },
  { family: "drop", name: "Drop Ab", notes: ["Ab1", "Eb2", "Ab2", "Db3", "F3", "Bb3"] },
  { family: "drop", name: "Drop G", notes: ["G1", "D2", "G2", "C3", "E3", "A3"] },
  { family: "drop", name: "Drop F#", notes: ["F#1", "C#2", "F#2", "B2", "D#3", "G#3"] },
  { family: "drop", name: "Drop F", notes: ["F1", "C2", "F2", "Bb2", "D3", "G3"] },
  { family: "open", name: "Open D", notes: ["D2", "A2", "D3", "F#3", "A3", "D4"] },
  { family: "open", name: "Open E", notes: ["E2", "B2", "E3", "G#3", "B3", "E4"] },
  { family: "open", name: "Open G", notes: ["D2", "G2", "D3", "G3", "B3", "D4"] },
  { family: "open", name: "Open A", notes: ["E2", "A2", "C#3", "E3", "A3", "E4"] },
  { family: "open", name: "Open C", notes: ["C2", "G2", "C3", "G3", "C4", "E4"] },
  { family: "alternate", name: "DADGAD", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
  { family: "alternate", name: "Double Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "D4"] },
  { family: "alternate", name: "All Fourths", notes: ["E2", "A2", "D3", "G3", "C4", "F4"] },
  { family: "alternate", name: "New Standard Tuning", notes: ["C2", "G2", "D3", "A3", "E4", "G4"] },
];

const ELECTRIC_GUITAR_7: PresetSpec[] = [
  { family: "standard", name: "B Standard", notes: ["B1", "E2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "standard", name: "Bb Standard", notes: ["Bb1", "Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { family: "standard", name: "A Standard", notes: ["A1", "D2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "standard", name: "Ab Standard", notes: ["Ab1", "Db2", "Gb2", "B2", "E3", "Ab3", "Db4"] },
  { family: "standard", name: "G Standard", notes: ["G1", "C2", "F2", "Bb2", "Eb3", "G3", "C4"] },
  { family: "standard", name: "F# Standard", notes: ["F#1", "B1", "E2", "A2", "D3", "F#3", "B3"] },
  { family: "standard", name: "F Standard", notes: ["F1", "Bb1", "Eb2", "Ab2", "Db3", "F3", "Bb3"] },
  { family: "standard", name: "E Standard", notes: ["E1", "A1", "D2", "G2", "C3", "E3", "A3"] },
  { family: "drop", name: "Drop A", notes: ["A1", "E2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "drop", name: "Drop Ab", notes: ["Ab1", "Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { family: "drop", name: "Drop G", notes: ["G1", "D2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "drop", name: "Drop F#", notes: ["F#1", "C#2", "F#2", "B2", "E3", "G#3", "C#4"] },
  { family: "drop", name: "Drop F", notes: ["F1", "C2", "F2", "Bb2", "Eb3", "G3", "Bb3"] },
  { family: "drop", name: "Drop E", notes: ["E1", "B1", "E2", "A2", "D3", "F#3", "B3"] },
  { family: "drop", name: "Drop Eb", notes: ["Eb1", "Bb1", "Eb2", "Ab2", "Db3", "F3", "Bb3"] },
  { family: "drop", name: "Drop D", notes: ["D1", "A1", "D2", "G2", "C3", "E3", "A3"] },
];

const ACOUSTIC_GUITAR_6: PresetSpec[] = [
  { family: "standard", name: "E Standard", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "standard", name: "Eb Standard", notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { family: "standard", name: "D Standard", notes: ["D2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "standard", name: "C# Standard", notes: ["C#2", "F#2", "B2", "E3", "G#3", "C#4"] },
  { family: "drop", name: "Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { family: "drop", name: "Drop C#", notes: ["C#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
  { family: "drop", name: "Drop C", notes: ["C2", "G2", "C3", "F3", "A3", "D4"] },
  { family: "open", name: "Open D", notes: ["D2", "A2", "D3", "F#3", "A3", "D4"] },
  { family: "open", name: "Open E", notes: ["E2", "B2", "E3", "G#3", "B3", "E4"] },
  { family: "open", name: "Open G", notes: ["D2", "G2", "D3", "G3", "B3", "D4"] },
  { family: "open", name: "Open A", notes: ["E2", "A2", "C#3", "E3", "A3", "E4"] },
  { family: "open", name: "Open C", notes: ["C2", "G2", "C3", "G3", "C4", "E4"] },
  { family: "alternate", name: "DADGAD", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
  { family: "alternate", name: "Double Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "D4"] },
  { family: "alternate", name: "All Fourths", notes: ["E2", "A2", "D3", "G3", "C4", "F4"] },
];

const BASS_4: PresetSpec[] = [
  { family: "standard", name: "E Standard", notes: ["E1", "A1", "D2", "G2"] },
  { family: "standard", name: "Eb Standard", notes: ["Eb1", "Ab1", "Db2", "Gb2"] },
  { family: "standard", name: "D Standard", notes: ["D1", "G1", "C2", "F2"] },
  { family: "standard", name: "C# Standard", notes: ["C#1", "F#1", "B1", "E2"] },
  { family: "standard", name: "C Standard", notes: ["C1", "F1", "Bb1", "Eb2"] },
  { family: "standard", name: "B Standard", notes: ["B0", "E1", "A1", "D2"] },
  { family: "standard", name: "Bb Standard", notes: ["Bb0", "Eb1", "Ab1", "Db2"] },
  { family: "standard", name: "A Standard", notes: ["A0", "D1", "G1", "C2"] },
  { family: "drop", name: "Drop D", notes: ["D1", "A1", "D2", "G2"] },
  { family: "drop", name: "Drop C#", notes: ["C#1", "G#1", "C#2", "F#2"] },
  { family: "drop", name: "Drop C", notes: ["C1", "G1", "C2", "F2"] },
  { family: "drop", name: "Drop B", notes: ["B0", "F#1", "B1", "E2"] },
  { family: "drop", name: "Drop Bb", notes: ["Bb0", "F1", "Bb1", "Eb2"] },
  { family: "drop", name: "Drop A", notes: ["A0", "E1", "A1", "D2"] },
  { family: "drop", name: "Drop Ab", notes: ["Ab0", "Eb1", "Ab1", "Db2"] },
  { family: "drop", name: "Drop G", notes: ["G0", "D1", "G1", "C2"] },
  { family: "drop", name: "Drop F#", notes: ["F#0", "C#1", "F#1", "B1"] },
  { family: "drop", name: "Drop F", notes: ["F0", "C1", "F1", "Bb1"] },
];

const BASS_5: PresetSpec[] = [
  { family: "standard", name: "B Standard", notes: ["B0", "E1", "A1", "D2", "G2"] },
  { family: "standard", name: "Bb Standard", notes: ["Bb0", "Eb1", "Ab1", "Db2", "Gb2"] },
  { family: "standard", name: "A Standard", notes: ["A0", "D1", "G1", "C2", "F2"] },
  { family: "standard", name: "Ab Standard", notes: ["Ab0", "Db1", "Gb1", "B1", "E2"] },
  { family: "standard", name: "G Standard", notes: ["G0", "C1", "F1", "Bb1", "Eb2"] },
  { family: "standard", name: "F# Standard", notes: ["F#0", "B0", "E1", "A1", "D2"] },
  { family: "standard", name: "F Standard", notes: ["F0", "Bb0", "Eb1", "Ab1", "Db2"] },
  { family: "standard", name: "E Standard", notes: ["E0", "A0", "D1", "G1", "C2"] },
  { family: "drop", name: "Drop A", notes: ["A0", "E1", "A1", "D2", "G2"] },
  { family: "drop", name: "Drop Ab", notes: ["Ab0", "Eb1", "Ab1", "Db2", "Gb2"] },
  { family: "drop", name: "Drop G", notes: ["G0", "D1", "G1", "C2", "F2"] },
  { family: "drop", name: "Drop F#", notes: ["F#0", "C#1", "F#1", "B1", "E2"] },
  { family: "drop", name: "Drop F", notes: ["F0", "C1", "F1", "Bb1", "Eb2"] },
  { family: "drop", name: "Drop E", notes: ["E0", "B0", "E1", "A1", "D2"] },
];

/** Every curated v1 preset, flattened — never mutated at runtime. */
export const TUNING_PRESETS: readonly TuningPreset[] = [
  ...buildPresets("electricGuitar", 6, ELECTRIC_GUITAR_6),
  ...buildPresets("electricGuitar", 7, ELECTRIC_GUITAR_7),
  ...buildPresets("acousticGuitar", 6, ACOUSTIC_GUITAR_6),
  ...buildPresets("bass", 4, BASS_4),
  ...buildPresets("bass", 5, BASS_5),
];

export function presetsFor(instrument: TuningExplorerInstrument, stringCount: StringCount): TuningPreset[] {
  return TUNING_PRESETS.filter((p) => p.instrument === instrument && p.stringCount === stringCount);
}

/**
 * Families that actually contain a preset for this instrument/string-count,
 * in the fixed canonical order (product spec §6) — "Custom" is always
 * appended last, since it's never data-backed.
 */
export function familiesFor(instrument: TuningExplorerInstrument, stringCount: StringCount): TuningFamily[] {
  const present = new Set(presetsFor(instrument, stringCount).map((p) => p.family));
  const ordered: TuningFamily[] = (["standard", "drop", "open", "alternate"] as const).filter((f) => present.has(f));
  ordered.push("custom");
  return ordered;
}

/**
 * The default/canonical preset for an instrument/string-count (product spec
 * §4/§24) — always the FIRST "standard"-family preset in that
 * configuration's list above. This is a deliberate data convention, not a
 * separate lookup table: `ELECTRIC_GUITAR_6` starts with "E Standard",
 * `ELECTRIC_GUITAR_7` with "B Standard", `BASS_5` with "B Standard", etc. —
 * exactly matching product spec §4/§24's required defaults. Throws if a
 * config has no standard preset at all, which would be a data bug (every
 * v1 instrument/string-count has one).
 */
export function defaultPresetFor(instrument: TuningExplorerInstrument, stringCount: StringCount): TuningPreset {
  const preset = presetsFor(instrument, stringCount).find((p) => p.family === "standard");
  if (!preset) {
    throw new Error(`No standard preset defined for ${instrument}/${stringCount}.`);
  }
  return preset;
}
