import type { Note } from "../notes/types";
import { letterAtOffset, mod12 } from "../notes/pitchClass";
import { noteToPitchClass, spellPitchClass } from "../notes/note";

/**
 * A chord/scale degree relative to a root: e.g. "b3" is { degree: 3, alteration: -1 },
 * "#5" is { degree: 5, alteration: 1 }, "9" is { degree: 9, alteration: 0 }.
 * Degrees beyond 7 (9, 11, 13, ...) are extensions an octave or more above the root.
 */
export interface ScaleDegree {
  degree: number;
  alteration: number;
}

/** Semitones of each major-scale degree 1-7 above the tonic. */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

export class ScaleDegreeParseError extends Error {}

const DEGREE_TOKEN_PATTERN = /^(bb|b|#{1,2})?(\d{1,2})$/;

/** Parses a formula token like "1", "b3", "#5", "bb7", "9" into a ScaleDegree. */
export function parseScaleDegreeToken(token: string): ScaleDegree {
  const match = DEGREE_TOKEN_PATTERN.exec(token.trim());
  if (!match) {
    throw new ScaleDegreeParseError(`"${token}" is not a valid scale degree.`);
  }
  const [, accidentalSymbol, degreeText] = match;
  const degree = Number.parseInt(degreeText, 10);
  const alteration =
    accidentalSymbol === undefined
      ? 0
      : accidentalSymbol === "b"
        ? -1
        : accidentalSymbol === "bb"
          ? -2
          : accidentalSymbol.length; // "#" or "##"
  return { degree, alteration };
}

/** How many letters above the root's letter this degree lands on (0-based, wraps every 7). */
export function degreeLetterOffset(degree: number): number {
  return ((degree - 1) % 7 + 7) % 7;
}

/** How many semitones above the root's pitch class this (unaltered) degree lands on. */
export function degreeSemitoneOffset(degree: number): number {
  const index = degreeLetterOffset(degree);
  const octaves = Math.floor((degree - 1) / 7);
  return MAJOR_SCALE_SEMITONES[index] + 12 * octaves;
}

/**
 * Builds the note at a scale degree above `root`, e.g. root C with { degree: 3,
 * alteration: -1 } ("b3") gives Eb — the correct letter (E, a diatonic third) with
 * the accidental needed to reach the altered pitch class.
 */
export function noteAtScaleDegree(root: Note, scaleDegree: ScaleDegree): Note {
  const letter = letterAtOffset(root.letter, degreeLetterOffset(scaleDegree.degree));
  const targetPitchClass = mod12(
    noteToPitchClass(root) +
      degreeSemitoneOffset(scaleDegree.degree) +
      scaleDegree.alteration,
  );
  return spellPitchClass(targetPitchClass, letter);
}
