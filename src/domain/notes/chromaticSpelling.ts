import type { Note, PitchClass } from "./types";
import { parseNoteName } from "./note";

/**
 * A GLOBAL sharp/flat display preference — distinct from `spellPitchClass`
 * (which spells a pitch class using a letter implied by musical/harmonic
 * context, e.g. a scale degree or key). This is for tools with no harmonic
 * context to derive a letter from — a chromatic display toggle the user
 * picks directly (Tuning Explorer's ♯/♭ switch). Sound/pitch never changes;
 * only which of the two conventional 12-tone chromatic spellings is shown.
 */
export type Notation = "sharp" | "flat";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

/** The conventional chromatic spelling of `pitchClass` (0-11, C=0) under a global sharp/flat preference — never double accidentals. */
export function noteForPitchClass(pitchClass: PitchClass, notation: Notation): Note {
  const names = notation === "sharp" ? SHARP_NAMES : FLAT_NAMES;
  return parseNoteName(names[((pitchClass % 12) + 12) % 12]);
}
