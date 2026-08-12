import type { Note } from "../../notes/types";
import { noteToPitchClass, mod12 } from "../../notes";
import { midiFromPitchClassAndOctave, frequencyFromMidi, type PlayablePitch } from "../playablePitch";
import type { BassStringNumber } from "./types";

/**
 * V1 standard 4-string electric bass tuning only (Phase 9 §3) — string 4
 * (thickest, lowest) = E1, string 3 = A1, string 2 = D2, string 1
 * (thinnest, highest) = G2. This is a genuinely separate tuning table from
 * Guitar's (different pitches, different string count) — 5/6-string and
 * alternate/drop tunings are explicitly out of scope this phase, but every
 * function here reads open-string pitch from this one table, so adding
 * them later only means adding tuning tables, never touching pattern
 * generation, playability, or ranking.
 */
const STANDARD_TUNING: Record<BassStringNumber, { letter: Note["letter"]; octave: number }> = {
  4: { letter: "E", octave: 1 },
  3: { letter: "A", octave: 1 },
  2: { letter: "D", octave: 2 },
  1: { letter: "G", octave: 2 },
};

function openStringMidi(stringNumber: BassStringNumber): number {
  const { letter, octave } = STANDARD_TUNING[stringNumber];
  const pitchClass = noteToPitchClass({ letter, accidental: 0 });
  return midiFromPitchClassAndOctave(pitchClass, octave);
}

export function openStringPitchClass(stringNumber: BassStringNumber): number {
  return mod12(openStringMidi(stringNumber));
}

/**
 * The real pitch at `fret` on `stringNumber`, spelled using `note` (the
 * chord engine's already-correct spelling for this pitch class — Phase 9
 * §33) rather than deriving a spelling from fret math. Callers must only
 * pass a `note` whose pitch class actually matches the fret's pitch class.
 */
export function pitchAtFret(stringNumber: BassStringNumber, fret: number, note: Note): PlayablePitch {
  const midi = openStringMidi(stringNumber) + fret;
  return { note, octave: Math.floor(midi / 12) - 1, midi, frequencyHz: frequencyFromMidi(midi) };
}

/** The fret (0-11) on `stringNumber` that reaches `pitchClass`, ignoring octave — the lowest such fret at or above the nut. */
export function fretForPitchClass(stringNumber: BassStringNumber, pitchClass: number): number {
  return mod12(pitchClass - openStringPitchClass(stringNumber));
}
