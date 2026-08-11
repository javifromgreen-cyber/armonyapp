import type { Note } from "../notes/types";
import { noteName, parseNoteName, NoteParseError } from "../notes/note";
import { parseScaleDegreeToken, noteAtScaleDegree } from "../intervals/scaleDegree";
import { transposeNote } from "../intervals/transpose";
import {
  CHORD_QUALITIES,
  chordQualityFromSuffix,
  canonicalSuffix,
  type ChordQualityId,
} from "./chordQuality";

export interface Chord {
  root: Note;
  qualityId: ChordQualityId;
}

/** The chord's notes in formula order (root first), e.g. Am7 -> A, C, E, G. */
export function chordNotes(chord: Chord): Note[] {
  return CHORD_QUALITIES[chord.qualityId].formula.map((token) =>
    noteAtScaleDegree(chord.root, parseScaleDegreeToken(token)),
  );
}

/** The chord's interval formula, e.g. ["1", "b3", "5", "b7"]. */
export function chordIntervalFormula(chord: Chord): readonly string[] {
  return CHORD_QUALITIES[chord.qualityId].formula;
}

export function buildChord(root: Note, qualityId: ChordQualityId): Chord {
  return { root, qualityId };
}

export class ChordParseError extends Error {}

const ROOT_PATTERN = /^[A-G](#{1,2}|b{1,2})?/;

export function parseChordSymbol(symbol: string): Chord {
  const trimmed = symbol.trim();
  const rootMatch = ROOT_PATTERN.exec(trimmed);
  if (!rootMatch) {
    throw new ChordParseError(`"${symbol}" does not start with a valid root note.`);
  }

  const rootText = rootMatch[0];
  const suffix = trimmed.slice(rootText.length);

  let root: Note;
  try {
    root = parseNoteName(rootText);
  } catch (error) {
    if (error instanceof NoteParseError) {
      throw new ChordParseError(`"${symbol}" does not start with a valid root note.`);
    }
    throw error;
  }

  const qualityId = chordQualityFromSuffix(suffix);
  if (!qualityId) {
    throw new ChordParseError(`"${suffix}" is not a recognized chord quality.`);
  }

  return { root, qualityId };
}

export function chordSymbol(chord: Chord): string {
  return noteName(chord.root) + canonicalSuffix(chord.qualityId);
}

/** Transposes a chord by semitones, preserving its quality/formula. */
export function transposeChord(chord: Chord, semitones: number): Chord {
  return { root: transposeNote(chord.root, semitones), qualityId: chord.qualityId };
}
