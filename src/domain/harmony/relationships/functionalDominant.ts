import type { Key } from "../../keys/key";
import { buildChord, type Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { isTonic } from "../harmonicFunction";
import { functionalDominant, functionalLeadingToneDiminished } from "../functionalMinor";
import { isRecognizedDominant } from "./secondaryDominant";
import type { HarmonicEdge, ZoomLevel } from "../types";

/**
 * Zoom 1, minor-key only: the *functional* (harmonic-minor-derived) dominant
 * and leading-tone-diminished chords, exposed alongside — not instead of —
 * the natural-minor diatonic v/VII from ../../keys. This is the concrete
 * mechanism for the product brief's "E7 -> Am through G#" requirement: in A
 * minor, the plain diatonic family still shows the natural (weak) Em/G, while
 * this family adds E7 and G#dim7 as the chords that actually carry dominant
 * pull, in both directions (tonic -> dominant, and dominant -> resolution).
 */
export function functionalDominantRelationships(
  source: Chord,
  context: Key,
): HarmonicEdge[] {
  if (context.mode !== "natural-minor") return [];

  const tonic = buildChord(context.tonic, "minor");
  const dominant = functionalDominant(context, "dominant7");
  const leadingToneDiminished = functionalLeadingToneDiminished(context, "diminished7");
  const depth: ZoomLevel = 1;
  const edges: HarmonicEdge[] = [];

  if (isTonic(source, context) && !isRecognizedDominant(source, context)) {
    edges.push({
      source,
      target: dominant,
      relationshipType: "functionalDominant",
      harmonicDepth: depth,
      strength: 0.9,
      explanation: { key: "harmony.relationship.functionalDominant" },
      context,
    });
    edges.push({
      source,
      target: leadingToneDiminished,
      relationshipType: "leadingToneDiminished",
      harmonicDepth: depth,
      strength: 0.6,
      explanation: { key: "harmony.relationship.leadingToneDiminished" },
      context,
    });
  }

  if (chordsEqual(source, dominant)) {
    edges.push({
      source,
      target: tonic,
      relationshipType: "functionalDominant",
      harmonicDepth: depth,
      strength: 0.95,
      explanation: { key: "harmony.relationship.functionalDominant.resolve" },
      context,
    });
  }

  if (chordsEqual(source, leadingToneDiminished)) {
    edges.push({
      source,
      target: tonic,
      relationshipType: "leadingToneDiminished",
      harmonicDepth: depth,
      strength: 0.85,
      explanation: { key: "harmony.relationship.leadingToneDiminished.resolve" },
      context,
    });
  }

  return edges;
}
