import { chordNotes, chordIntervalFormula, type Chord } from "../../chords/chord";
import { noteToPitchClass, mod12 } from "../../notes";
import type { Note } from "../../notes/types";
import { pitchAtFret, openStringPitchClass } from "./tuning";
import type { GuitarStringSound, StringNumber } from "./types";

export interface ChordTone {
  note: Note;
  pitchClass: number;
  /** The formula token this tone represents (e.g. "1", "b3", "5", "b7") — same vocabulary `chordIntervalFormula` already uses elsewhere in the app. */
  token: string;
}

/** The chord's own notes, correctly spelled, paired with their formula token and pitch class — the single source of truth every guitar string-sound is built from (Phase 8 §1: never re-derive harmony here). */
export function chordToneTable(chord: Chord): ChordTone[] {
  const notes = chordNotes(chord);
  const formula = chordIntervalFormula(chord);
  return notes.map((note, index) => ({
    note,
    pitchClass: noteToPitchClass(note),
    token: formula[index],
  }));
}

export function toneForPitchClass(tones: ChordTone[], pitchClass: number): ChordTone | undefined {
  return tones.find((tone) => tone.pitchClass === pitchClass);
}

/** Builds a sounding (open or fretted) string entry, or `undefined` if `fret` doesn't land on any of the chord's tones — callers must not use a fret that fails this check. */
export function buildStringSound(
  stringNumber: StringNumber,
  fret: number,
  tones: ChordTone[],
): GuitarStringSound | undefined {
  const pitchClass = mod12(openStringPitchClass(stringNumber) + fret);
  const tone = toneForPitchClass(tones, pitchClass);
  if (!tone) return undefined;
  return {
    string: stringNumber,
    state: fret === 0 ? { status: "open" } : { status: "fretted", fret },
    pitch: pitchAtFret(stringNumber, fret, tone.note),
    intervalToken: tone.token,
  };
}

export function mutedStringSound(stringNumber: StringNumber): GuitarStringSound {
  return { string: stringNumber, state: { status: "muted" } };
}
