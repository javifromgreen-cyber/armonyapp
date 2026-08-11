import type { Key } from "../../keys/key";
import { diatonicChords, relativeKey } from "../../keys/key";
import { noteAtScaleDegree } from "../../intervals/scaleDegree";
import { buildChord, type Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { isTonic } from "../harmonicFunction";
import { borrowedChords } from "./borrowed";
import type { HarmonicEdge } from "../types";

function dominantKeyOf(key: Key): Key {
  return { tonic: noteAtScaleDegree(key.tonic, { degree: 5, alteration: 0 }), mode: key.mode };
}

function subdominantKeyOf(key: Key): Key {
  return { tonic: noteAtScaleDegree(key.tonic, { degree: 4, alteration: 0 }), mode: key.mode };
}

function tonicTriad(key: Key): Chord {
  return buildChord(key.tonic, key.mode === "major" ? "major" : "minor");
}

/**
 * Zoom 3: "nearby modulation relationships", anchored at the tonic. The
 * immediately-diatonic closely-related keys (dominant, subdominant, relative
 * minor/major) are *not* used here — their tonics are, by construction,
 * already diatonic chords the Zoom 1 family exposes (e.g. C major's dominant
 * key is G major, and G is already the diatonic V), so a separate edge to the
 * same chord would just be a relabeled duplicate. Instead this goes one step
 * further along the circle of fifths — the dominant-of-the-dominant and
 * subdominant-of-the-subdominant keys, plus their relatives — which are
 * genuinely new, non-diatonic tonal centers (e.g. from C major: D major, B
 * minor, G minor — Bb major, the other candidate, is excluded here because it
 * coincides with ../borrowed's bVII, which gets the more specific label).
 */
export function nearbyKeyRelationships(source: Chord, context: Key): HarmonicEdge[] {
  if (!isTonic(source, context)) return [];

  const dominantOfDominant = dominantKeyOf(dominantKeyOf(context));
  const subdominantOfSubdominant = subdominantKeyOf(subdominantKeyOf(context));

  const candidates: Array<{ key: Key; explanationKey: string; strength: number }> = [
    { key: dominantOfDominant, explanationKey: "dominantOfDominant", strength: 0.45 },
    { key: subdominantOfSubdominant, explanationKey: "subdominantOfSubdominant", strength: 0.45 },
    { key: relativeKey(dominantOfDominant), explanationKey: "relativeOfDominantOfDominant", strength: 0.3 },
    { key: relativeKey(subdominantOfSubdominant), explanationKey: "relativeOfSubdominantOfSubdominant", strength: 0.3 },
  ];

  const excluded = [...diatonicChords(context).map((d) => d.chord), ...borrowedChords(context)];

  return candidates
    .map((candidate) => ({ ...candidate, target: tonicTriad(candidate.key) }))
    .filter((candidate) => !excluded.some((chord) => chordsEqual(chord, candidate.target)))
    .map((candidate) => ({
      source,
      target: candidate.target,
      relationshipType: "nearbyKey",
      harmonicDepth: 3,
      strength: candidate.strength,
      explanation: { key: `harmony.relationship.nearbyKey.${candidate.explanationKey}` },
      context,
    }));
}
