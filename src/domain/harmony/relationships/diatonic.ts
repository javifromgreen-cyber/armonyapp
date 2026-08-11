import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import type { Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { classifyFunction } from "../harmonicFunction";
import type { HarmonicEdge } from "../types";

/**
 * Zoom 1: the key's diatonic triads, excluding the source chord itself. This
 * is the product-spec worked example verbatim — from any diatonic chord in C
 * major, the other 6 diatonic triads (e.g. C -> Dm, Em, F, G, Am, Bdim).
 */
export function diatonicRelationships(source: Chord, context: Key): HarmonicEdge[] {
  return diatonicChords(context)
    .map((d) => d.chord)
    .filter((target) => !chordsEqual(target, source))
    .map((target) => ({
      source,
      target,
      relationshipType: "diatonic",
      harmonicDepth: 1,
      strength: 0.8,
      explanation: {
        key: "harmony.relationship.diatonic",
        params: {
          function: classifyFunction(target, context) ?? "other",
        },
      },
      context,
    }));
}
