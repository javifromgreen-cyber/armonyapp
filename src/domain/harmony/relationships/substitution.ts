import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import type { Chord } from "../../chords/chord";
import { noteToPitchClass } from "../../notes/note";
import { sharedToneCount } from "../chordIdentity";
import { classifyFunction } from "../harmonicFunction";
import { contextualRole } from "../contextualRole";
import type { HarmonicEdge } from "../types";

const MIN_SHARED_TONES_FOR_SUBSTITUTION = 2;

/**
 * Zoom 2: "basic substitutions" — other diatonic chords sharing the source's
 * harmonic function AND at least 2 common tones (the two conditions together
 * are what make a substitution actually work in practice, not just share a
 * label). E.g. in C major: C <-> Am and C <-> Em (tonic function, 2 shared
 * tones each); F <-> Dm (predominant); G <-> Bdim (dominant).
 *
 * Uses ../contextualRole rather than the plain root-based family: a chord
 * whose root sits on the tonic but whose quality makes it something more
 * specific (e.g. C7 in C major, which is V7/IV) is not a "tonic-function"
 * chord and must not be offered same-function diatonic substitutes as if it
 * were one. Excludes same-ROOT targets (not just exact chord identity) —
 * "Cmaj7 substitutes for C" isn't a meaningful substitution, just the same
 * root with an extension.
 */
export function substitutionRelationships(source: Chord, context: Key): HarmonicEdge[] {
  const role = contextualRole(source, context);
  const sourceFunction =
    role?.kind === "tonic" || role?.kind === "predominant" || role?.kind === "dominant"
      ? role.kind
      : undefined;
  if (!sourceFunction) return [];

  const sourceRootPitchClass = noteToPitchClass(source.root);

  return diatonicChords(context)
    .map((d) => d.chord)
    .filter((target) => noteToPitchClass(target.root) !== sourceRootPitchClass)
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
