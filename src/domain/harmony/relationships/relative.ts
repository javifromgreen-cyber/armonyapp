import type { Key } from "../../keys/key";
import { relativeKey } from "../../keys/key";
import { buildChord, type Chord } from "../../chords/chord";
import { isTonic } from "../harmonicFunction";
import type { HarmonicEdge } from "../types";

/**
 * Zoom 1: the key's relative major/minor tonic (e.g. C major -> Am, or A minor
 * -> C), exposed from any tonic-function chord (quality-agnostic — Cmaj7
 * counts, not just the plain C triad) — it's a relationship between *keys*,
 * so it's most meaningful anchored at the current tonal center rather than
 * attached to every diatonic chord.
 */
export function relativeRelationships(source: Chord, context: Key): HarmonicEdge[] {
  if (!isTonic(source, context)) return [];

  const relative = relativeKey(context);
  const target = buildChord(relative.tonic, relative.mode === "major" ? "major" : "minor");

  return [
    {
      source,
      target,
      relationshipType: "relative",
      harmonicDepth: 1,
      strength: 0.75,
      explanation: {
        key: "harmony.relationship.relative",
        params: { mode: relative.mode },
      },
      context,
    },
  ];
}
