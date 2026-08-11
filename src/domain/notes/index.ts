export type { Letter, Note, PitchClass } from "./types";
export { LETTERS } from "./types";
export { NATURAL_PITCH_CLASS, mod12, letterAtOffset } from "./pitchClass";
export {
  noteToPitchClass,
  spellPitchClass,
  noteName,
  parseNoteName,
  isLetter,
  NoteParseError,
} from "./note";
