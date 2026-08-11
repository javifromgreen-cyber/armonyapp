import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import type { Chord } from "../../chords/chord";
import { chordsEqual, sharedToneCount } from "../chordIdentity";
import { classifyFunction } from "../harmonicFunction";
import type { HarmonicEdge } from "../types";

const MIN_SHARED_TONES_FOR_SUBSTITUTION = 2;

/**
 * Zoom 2: "basic substitutions" — other diatonic chords sharing the source's
 * harmonic function AND at least 2 common tones (the two conditions together
 * are what make a substitution actually work in practice, not just share a
 * label). E.g. in C major: C <-> Am and C <-> Em (tonic function, 2 shared
 * tones each); F <-> Dm (predominant); G <-> Bdim (dominant).
 */
export function substitutionRelationships(source: Chord, context: Key): HarmonicEdge[] {
  const sourceFunction = classifyFunction(source, context);
  if (!sourceFunction) return [];

  return diatonicChords(context)
    .map((d) => d.chord)
    .filter((target) => !chordsEqual(target, source))
    .filter((target) => classifyFunction(target, context) === sourceFunction)
    .filter((target) => sharedToneCount(source, target) >= MIN_SHARED_TONES_FOR_SUBSTITUTION)
    .map((target) => ({
      source,
      target,
      relationshipType: "substitution",
      harmonicDepth: 2,
      strength: 0.55,
      explanation: {
        key: "harmony.relationship.substitution",
        params: { function: sourceFunction },
      },
      context,
    }));
}
