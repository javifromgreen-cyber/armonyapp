import { LETTERS, type Letter, type Note, type PitchClass } from "./types";
import { NATURAL_PITCH_CLASS, mod12 } from "./pitchClass";

export function noteToPitchClass(note: Note): PitchClass {
  return mod12(NATURAL_PITCH_CLASS[note.letter] + note.accidental);
}

/**
 * Spells a target pitch class using the given letter, choosing the accidental
 * that reaches it. This is the single place enharmonic spelling happens: callers
 * always supply the letter implied by musical context (a scale degree, a key),
 * never a hardcoded sharp/flat preference.
 */
export function spellPitchClass(target: PitchClass, letter: Letter): Note {
  const natural = NATURAL_PITCH_CLASS[letter];
  let accidental = mod12(target - natural);
  if (accidental > 6) accidental -= 12;
  return { letter, accidental };
}

const ACCIDENTAL_SYMBOL = { sharp: "#", flat: "b" } as const;

export function noteName(note: Note): string {
  if (note.accidental === 0) return note.letter;
  const symbol =
    note.accidental > 0 ? ACCIDENTAL_SYMBOL.sharp : ACCIDENTAL_SYMBOL.flat;
  return note.letter + symbol.repeat(Math.abs(note.accidental));
}

export class NoteParseError extends Error {}

const NOTE_NAME_PATTERN = /^([A-G])(#{1,2}|b{1,2})?$/;

export function parseNoteName(input: string): Note {
  const match = NOTE_NAME_PATTERN.exec(input.trim());
  if (!match) {
    throw new NoteParseError(`"${input}" is not a valid note name.`);
  }
  const [, letter, accidentalSymbol] = match;
  const accidental = !accidentalSymbol
    ? 0
    : accidentalSymbol[0] === "#"
      ? accidentalSymbol.length
      : -accidentalSymbol.length;
  return { letter: letter as Letter, accidental };
}

export function isLetter(value: string): value is Letter {
  return (LETTERS as readonly string[]).includes(value);
}
