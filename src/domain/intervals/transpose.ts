import type { Note } from "../notes/types";
import { letterAtOffset, mod12 } from "../notes/pitchClass";
import { noteToPitchClass, spellPitchClass } from "../notes/note";

/**
 * Letter offset used to spell a generic (quality-agnostic) transposition by N
 * semitones (0-11 within an octave), e.g. 2 semitones is spelled as a major
 * second (letter + 1), not an augmented unison. Ascending semitones are spelled
 * with the smaller generic interval where a distance is ambiguous, e.g. a
 * single ascending semitone is a minor second (C -> Db, not C#).
 */
const ASCENDING_INTERVAL_LETTER_OFFSET = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/**
 * The tritone (6 semitones) is its own inversion (6 + 6 = 12), so no single
 * fixed letter offset can make ascending and descending transposition inverses
 * of each other — applying +6 then -6 would not return the original note. We
 * break the tie by direction, matching the common convention of spelling an
 * ascending tritone as an augmented fourth (C -> F#) and a descending tritone
 * as a diminished fifth (C -> Gb); this also restores round-trip correctness.
 */
const DESCENDING_INTERVAL_LETTER_OFFSET = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];

/**
 * Transposes a note by an arbitrary number of semitones (positive or negative),
 * choosing a musically conventional letter spelling for the interval travelled
 * rather than a fixed sharp/flat table.
 */
export function transposeNote(note: Note, semitones: number): Note {
  const octaves = Math.floor(semitones / 12);
  const remainder = mod12(semitones);
  const table =
    semitones >= 0
      ? ASCENDING_INTERVAL_LETTER_OFFSET
      : DESCENDING_INTERVAL_LETTER_OFFSET;
  const letterSteps = table[remainder] + 7 * octaves;
  const targetLetter = letterAtOffset(note.letter, letterSteps);
  const targetPitchClass = mod12(noteToPitchClass(note) + semitones);
  return spellPitchClass(targetPitchClass, targetLetter);
}
