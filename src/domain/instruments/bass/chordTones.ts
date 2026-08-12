import { chordNotes, chordIntervalFormula, type Chord } from "../../chords/chord";
import { noteToPitchClass, mod12 } from "../../notes";
import type { Note } from "../../notes/types";
import { pitchAtFret, openStringPitchClass } from "./tuning";
import type { BassPatternStep, BassStringNumber } from "./types";

export interface ChordTone {
  note: Note;
  pitchClass: number;
  /** The formula token this tone represents (e.g. "1", "b3", "5", "b7", "9") — Phase 9 §8: derived from the real chord engine, never a separately hard-coded major/minor table. */
  token: string;
}

/** The chord's own notes, correctly spelled, paired with their formula token and pitch class — the single source of truth every bass pattern step is built from (Phase 9 §1/§2: never re-derive harmony here). */
export function bassChordToneTable(chord: Chord): ChordTone[] {
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

/** Builds a pattern step at (string, fret), or `undefined` if that fret doesn't land on any of the chord's tones. */
export function buildPatternStep(
  stringNumber: BassStringNumber,
  fret: number,
  tones: ChordTone[],
): BassPatternStep | undefined {
  const pitchClass = mod12(openStringPitchClass(stringNumber) + fret);
  const tone = toneForPitchClass(tones, pitchClass);
  if (!tone) return undefined;
  return {
    string: stringNumber,
    fret,
    pitch: pitchAtFret(stringNumber, fret, tone.note),
    intervalToken: tone.token,
  };
}
