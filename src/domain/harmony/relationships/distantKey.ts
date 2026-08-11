import type { Key } from "../../keys/key";
import { transposeNote } from "../../intervals/transpose";
import { buildChord, type Chord } from "../../chords/chord";
import { isTonic } from "../harmonicFunction";
import type { HarmonicEdge } from "../types";

/**
 * Zoom 4: the single most distant key relationship — the tonic a tritone away
 * (maximally distant on the circle of fifths), same mode. E.g. C major ->
 * F#/Gb major. Anchored at the tonic only; this is intentionally the sparsest
 * family in the catalogue ("remote harmonic relationships... deep graph
 * exploration" per product-spec.md §8, not a family to explore from every
 * chord).
 */
export function distantKeyRelationships(source: Chord, context: Key): HarmonicEdge[] {
  if (!isTonic(source, context)) return [];

  const distantTonic = transposeNote(context.tonic, 6);
  const target = buildChord(distantTonic, context.mode === "major" ? "major" : "minor");

  return [
    {
      source,
      target,
      relationshipType: "distantKey",
      harmonicDepth: 4,
      strength: 0.2,
      explanation: { key: "harmony.relationship.distantKey" },
      context,
    },
  ];
}
