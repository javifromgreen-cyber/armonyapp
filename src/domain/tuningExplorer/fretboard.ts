import type { Notation } from "../notes";
import { noteForPitchClass, noteName } from "../notes";

/**
 * One playable position on the fretboard (product spec §9). Deliberately
 * carries only `midi`/`pitchClass` — never a spelled `Note` — since display
 * spelling is a separate, purely presentational concern
 * (`displayNameFor`/the global sharp-flat toggle): the same fret position's
 * `midi` never changes when notation is switched, only how it's labeled.
 */
export interface FretPosition {
  /** 0 = lowest/thickest string, increasing toward the highest/thinnest — matches `openStringsMidi`'s storage order (product spec §7/§11). Rendering reverses this for the tablature-style high-to-low visual layout. */
  stringIndex: number;
  /** 0 = open string. */
  fret: number;
  midi: number;
  pitchClass: number;
}

/**
 * The entire deterministic pitch model (product spec §9): `pitch =
 * openStringMidi + fret`. Returns one array per string (in `openStringsMidi`
 * order, i.e. low to high), each containing frets `0..maxFret` inclusive.
 * Framework-free and pure — every value a caller could need to render a
 * position (string/fret/midi/pitch class) is already here; display note
 * NAMES are computed separately via `displayNameFor`, since that depends on
 * a UI-level sharp/flat preference this module has no business knowing
 * about.
 */
export function generateFretboard(openStringsMidi: readonly number[], maxFret: number): FretPosition[][] {
  return openStringsMidi.map((openMidi, stringIndex) => {
    const positions: FretPosition[] = [];
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = openMidi + fret;
      positions.push({ stringIndex, fret, midi, pitchClass: ((midi % 12) + 12) % 12 });
    }
    return positions;
  });
}

/** The single fretted position at `stringIndex`/`fret` — `pitch = openStringMidi + fret` (product spec §9), the same formula `generateFretboard` uses per-cell. */
export function pitchAt(openStringsMidi: readonly number[], stringIndex: number, fret: number): FretPosition {
  const midi = openStringsMidi[stringIndex] + fret;
  return { stringIndex, fret, midi, pitchClass: ((midi % 12) + 12) % 12 };
}

/** The display note name for a position under the current sharp/flat preference (product spec §10) — octave-agnostic (e.g. "C#", "Eb"), matching how fret labels are shown. */
export function displayNameFor(position: FretPosition, notation: Notation): string {
  return noteName(noteForPitchClass(position.pitchClass, notation));
}
