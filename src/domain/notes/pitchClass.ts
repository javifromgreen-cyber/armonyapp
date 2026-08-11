import { LETTERS, type Letter, type PitchClass } from "./types";

export const NATURAL_PITCH_CLASS: Record<Letter, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Normalizes any integer to the 0-11 pitch class range. */
export function mod12(value: number): PitchClass {
  return ((value % 12) + 12) % 12;
}

/** Moves `offset` letters forward (or backward, for negative offsets) from `letter`. */
export function letterAtOffset(letter: Letter, offset: number): Letter {
  const startIndex = LETTERS.indexOf(letter);
  const index = ((startIndex + offset) % 7 + 7) % 7;
  return LETTERS[index];
}
