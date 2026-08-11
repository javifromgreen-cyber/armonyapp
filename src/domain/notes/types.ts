/** A letter name in the fixed musical alphabet (wraps G -> A). */
export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** Cyclic letter order — index arithmetic on this array is how letters are "moved". */
export const LETTERS: readonly Letter[] = ["A", "B", "C", "D", "E", "F", "G"];

/** An unspelled pitch, 0 (C) through 11 (B). */
export type PitchClass = number;

/**
 * A spelled note: a letter plus an accidental offset in semitones
 * (-2 = bb, -1 = b, 0 = natural, 1 = #, 2 = ##).
 */
export interface Note {
  letter: Letter;
  accidental: number;
}
