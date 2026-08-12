import type { Note } from "../../notes/types";
import { noteToPitchClass, mod12 } from "../../notes";
import { midiFromPitchClassAndOctave, frequencyFromMidi, type PlayablePitch } from "../playablePitch";
import type { StringNumber } from "./types";

/**
 * V1 standard tuning only (Phase 8 §3) — E2 A2 D3 G3 B3 E4, string 6 (low E)
 * to string 1 (high E). Alternate tunings are a future extension; nothing
 * here hard-codes the assumption elsewhere in a way that would block it —
 * every function below takes the tuning table as the single source of
 * truth for open-string pitch.
 */
const STANDARD_TUNING: Record<StringNumber, { letter: Note["letter"]; octave: number }> = {
  6: { letter: "E", octave: 2 },
  5: { letter: "A", octave: 2 },
  4: { letter: "D", octave: 3 },
  3: { letter: "G", octave: 3 },
  2: { letter: "B", octave: 3 },
  1: { letter: "E", octave: 4 },
};

function openStringMidi(stringNumber: StringNumber): number {
  const { letter, octave } = STANDARD_TUNING[stringNumber];
  const pitchClass = noteToPitchClass({ letter, accidental: 0 });
  return midiFromPitchClassAndOctave(pitchClass, octave);
}

export function openStringPitchClass(stringNumber: StringNumber): number {
  return mod12(openStringMidi(stringNumber));
}

/**
 * The real pitch at `fret` on `stringNumber`, spelled using `note` (the
 * chord engine's already-correct spelling for this pitch class — Phase 8
 * §29) rather than deriving a spelling from fret math. Callers must only
 * pass a `note` whose pitch class actually matches the fret's pitch class;
 * this function does not re-derive or validate that, it just attaches the
 * real octave.
 */
export function pitchAtFret(stringNumber: StringNumber, fret: number, note: Note): PlayablePitch {
  const midi = openStringMidi(stringNumber) + fret;
  return { note, octave: Math.floor(midi / 12) - 1, midi, frequencyHz: frequencyFromMidi(midi) };
}

/** The fret (0-11) on `stringNumber` that reaches `pitchClass`, ignoring octave — the lowest such fret at or above the nut. */
export function fretForPitchClass(stringNumber: StringNumber, pitchClass: number): number {
  return mod12(pitchClass - openStringPitchClass(stringNumber));
}
