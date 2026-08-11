import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import { noteAtScaleDegree } from "../../intervals/scaleDegree";
import type { Note } from "../../notes/types";
import { buildChord, type Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { diatonicDegreeOf } from "../harmonicFunction";
import { functionalDominant } from "../functionalMinor";
import { diatonicSeventhChords } from "./diatonicSeventh";
import type { HarmonicEdge } from "../types";

/** The dominant-7th chord a perfect fifth above `root`, spelled relative to it. */
export function dominantOf(root: Note): Chord {
  return buildChord(noteAtScaleDegree(root, { degree: 5, alteration: 0 }), "dominant7");
}

/**
 * Degrees that get a secondary dominant: every diatonic degree except the
 * tonic (degree 1, which needs no tonicizing) and the leading-tone chord
 * (degree 7, diminished — "V7/vii" is not a standard secondary dominant target
 * in tonal practice).
 */
const TONICIZABLE_DEGREES = [2, 3, 4, 5, 6];

export interface SecondaryDominantTarget {
  degree: number;
  /** The secondary dominant itself, e.g. A7 for V7/ii. */
  chord: Chord;
  /** What it resolves to, e.g. Dm for V7/ii. */
  resolvesTo: Chord;
}

/**
 * Degree -> secondary-dominant target chord, excluding any degree whose
 * secondary dominant coincides with a plain diatonic-seventh chord. This
 * exists for exactly one case: in any natural-minor key, V7/III and the
 * diatonic bVII7 are *always* the identical chord (both land a major 7th
 * above the tonic — a provable identity of natural-minor's interval
 * structure, not a coincidence of one particular key), so tonicizing degree 3
 * would otherwise silently duplicate ../diatonicSeventh's bVII7 under a
 * different, misleading label. See docs/music-engine.md.
 *
 * Exported (not just used internally) so ../contextualRole can look up which
 * degree a recognized secondary-dominant chord targets.
 */
export function secondaryDominantTargets(context: Key): SecondaryDominantTarget[] {
  const diatonic = diatonicChords(context);
  const diatonicSevenths = diatonicSeventhChords(context);

  return TONICIZABLE_DEGREES.map((degree) => {
    const target = diatonic.find((d) => d.degree === degree);
    return target
      ? { degree, chord: dominantOf(target.chord.root), resolvesTo: target.chord }
      : undefined;
  })
    .filter((entry): entry is SecondaryDominantTarget => entry !== undefined)
    .filter((entry) => !diatonicSevenths.some((chord) => chordsEqual(chord, entry.chord)));
}

/**
 * Every dominant-7th chord that is a "legitimate" (recognized, resolvable)
 * dominant in this context, together with what it resolves to: the primary
 * functional dominant (V7, or A minor's E7, resolving to the tonic) plus the
 * single-level secondary dominants. Shared by the secondary-dominant family
 * itself and by ../tritoneSubstitution, which needs the resolution target to
 * spell the substitute correctly (as its conventional bII, not a generic
 * transposition) — never an arbitrary dominant7 chord the source happens to be.
 */
export function recognizedDominants(
  context: Key,
): Array<{ chord: Chord; resolvesTo: Chord }> {
  return [
    { chord: functionalDominant(context, "dominant7"), resolvesTo: buildChord(context.tonic, context.mode === "major" ? "major" : "minor") },
    ...secondaryDominantTargets(context).map(({ chord, resolvesTo }) => ({ chord, resolvesTo })),
  ];
}

export function recognizedDominantSeventhChords(context: Key): Chord[] {
  return recognizedDominants(context).map((entry) => entry.chord);
}

/**
 * Whether `chord` is exactly one of this context's recognized dominants (the
 * primary functional dominant or a single-level secondary dominant) —
 * exported so every "anchored at the tonic" relationship family can decline
 * to fire when the source's ROOT happens to coincide with the tonic but the
 * chord itself is actually a dominant of some *other* degree. Without this
 * guard, e.g. C7 in C major (root C, same as the tonic, but really V7/IV)
 * would be misread as "browsing secondary dominants from the tonic" — see
 * docs/music-engine.md.
 */
export function isRecognizedDominant(chord: Chord, context: Key): boolean {
  return recognizedDominantSeventhChords(context).some((candidate) =>
    chordsEqual(candidate, chord),
  );
}

/**
 * Zoom 2: simple (single-level) secondary dominants — the dominant 7th chord
 * of each other diatonic degree, e.g. in C major: A7 (V7/ii), B7 (V7/iii), C7
 * (V7/IV), D7 (V7/V), E7 (V7/vi). Mode-agnostic: works the same way for
 * natural-minor context degrees.
 */
export function secondaryDominantRelationships(source: Chord, context: Key): HarmonicEdge[] {
  const sourceDegree = diatonicDegreeOf(source, context);
  const targets = secondaryDominantTargets(context);

  // Only exposed as outgoing edges from the tonic (browsing "what secondary
  // dominants exist in this key") and from each secondary dominant itself
  // (resolution back to the tonicized degree). A chord whose root happens to
  // equal the tonic but which IS itself one of `targets` (e.g. C7 in C major)
  // is NOT "at the tonic" for this purpose — it only ever resolves.
  if (sourceDegree === 1 && !targets.some(({ chord }) => chordsEqual(chord, source))) {
    return targets.map(({ degree, chord }) => ({
      source,
      target: chord,
      relationshipType: "secondaryDominant",
      harmonicDepth: 2,
      strength: 0.65,
      explanation: {
        key: "harmony.relationship.secondaryDominant",
        params: { targetDegree: degree },
      },
      context,
    }));
  }

  const diatonic = diatonicChords(context);
  const edges: HarmonicEdge[] = [];
  for (const { degree, chord: dominant } of targets) {
    if (!chordsEqual(source, dominant)) continue;
    const target = diatonic.find((d) => d.degree === degree);
    if (!target) continue;
    edges.push({
      source,
      target: target.chord,
      relationshipType: "secondaryDominant",
      harmonicDepth: 2,
      strength: 0.85,
      explanation: {
        key: "harmony.relationship.secondaryDominantResolve",
        params: { targetDegree: degree },
      },
      context,
    });
  }
  return edges;
}

/**
 * Zoom 3: "chains of secondary dominants" — deliberately scoped to the single
 * most common chain, the double dominant V7/V/V (e.g. in C major: D7 is V7/V;
 * its own secondary dominant, A7, tonicizes D). Exhaustive secondary-dominant
 * chains of arbitrary length are out of scope for v1 — see docs/music-engine.md.
 */
export function secondaryDominantChainRelationships(
  source: Chord,
  context: Key,
): HarmonicEdge[] {
  const diatonic = diatonicChords(context);
  const dominant = diatonic.find((d) => d.degree === 5);
  if (!dominant) return [];

  const vOfV = dominantOf(dominant.chord.root); // V7/V
  const vOfVOfV = dominantOf(vOfV.root); // V7/V/V

  if (chordsEqual(source, dominant.chord)) {
    return [
      {
        source,
        target: vOfV,
        relationshipType: "secondaryDominantChain",
        harmonicDepth: 3,
        strength: 0.5,
        explanation: { key: "harmony.relationship.secondaryDominantChain" },
        context,
      },
    ];
  }

  if (chordsEqual(source, vOfV)) {
    return [
      {
        source,
        target: vOfVOfV,
        relationshipType: "secondaryDominantChain",
        harmonicDepth: 3,
        strength: 0.4,
        explanation: { key: "harmony.relationship.secondaryDominantChain" },
        context,
      },
    ];
  }

  return [];
}
