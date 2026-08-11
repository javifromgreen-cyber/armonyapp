import type { Chord } from "../chords/chord";
import type { Key } from "../keys/key";
import { keyScaleNotes } from "../keys/key";
import { noteToPitchClass } from "../notes/note";
import type { HarmonicFunction } from "./types";

/**
 * Degree -> function, applied uniformly to both major and natural-minor
 * context (product-spec.md §11 wants a concise tonic/predominant/dominant
 * label, not a full functional-harmony treatise). This is a deliberate v1
 * simplification: it does not distinguish minor's weaker natural v/VII from
 * major's stronger V/vii°. The *strength* of a minor key's dominant is instead
 * modeled explicitly by ../functionalMinor (the raised-leading-tone V7/vii°),
 * which is a separate, additional relationship — see docs/music-engine.md.
 */
const DEGREE_FUNCTION: Record<number, HarmonicFunction> = {
  1: "tonic",
  2: "predominant",
  3: "tonic",
  4: "predominant",
  5: "dominant",
  6: "tonic",
  7: "dominant",
};

/**
 * Classifies a chord's harmonic function in a tonal context by matching its
 * ROOT's pitch class against the key's diatonic scale degrees — deliberately
 * quality-agnostic, so Cmaj7, C6, and the plain C triad are all recognized as
 * scale-degree-1 (tonic) in C major. Returns undefined for a chord whose root
 * isn't diatonic to the context (borrowed/chromatic chords have no single
 * scale-degree function).
 */
export function classifyFunction(chord: Chord, context: Key): HarmonicFunction | undefined {
  const degree = diatonicDegreeOf(chord, context);
  return degree === undefined ? undefined : DEGREE_FUNCTION[degree];
}

/** The 1-7 scale degree whose root matches this chord's root, if any. */
export function diatonicDegreeOf(chord: Chord, context: Key): number | undefined {
  const scale = keyScaleNotes(context);
  const rootPitchClass = noteToPitchClass(chord.root);
  const index = scale.findIndex((note) => noteToPitchClass(note) === rootPitchClass);
  return index === -1 ? undefined : index + 1;
}

export function isDiatonicRoot(rootPitchClass: number, context: Key): boolean {
  return keyScaleNotes(context).some(
    (note) => noteToPitchClass(note) === rootPitchClass,
  );
}

/**
 * Whether `chord`'s ROOT is the key's tonic — quality-agnostic, so Cmaj7, C6,
 * and the plain C triad are all "at the tonic" in C major. Relationship
 * families anchored at the tonic (relative key, functional dominant,
 * borrowed chords, nearby/distant keys) use this rather than exact chord
 * identity, so they still fire when exploring from a 7th-chord or extended
 * tonic, matching the product brief's own worked example ("exploring Cmaj7").
 */
export function isTonic(chord: Chord, context: Key): boolean {
  return diatonicDegreeOf(chord, context) === 1;
}
