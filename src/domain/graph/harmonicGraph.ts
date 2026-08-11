import type { Key } from "../keys/key";
import type { Chord } from "../chords/chord";
import { chordsEqual } from "../harmony/chordIdentity";
import type { HarmonicEdge, ZoomLevel } from "../harmony/types";
import { diatonicRelationships } from "../harmony/relationships/diatonic";
import { relativeRelationships } from "../harmony/relationships/relative";
import { functionalDominantRelationships } from "../harmony/relationships/functionalDominant";
import { diatonicSeventhRelationships } from "../harmony/relationships/diatonicSeventh";
import { secondaryDominantRelationships, secondaryDominantChainRelationships } from "../harmony/relationships/secondaryDominant";
import { borrowedRelationships } from "../harmony/relationships/borrowed";
import { substitutionRelationships } from "../harmony/relationships/substitution";
import { tritoneSubstitutionRelationships } from "../harmony/relationships/tritoneSubstitution";
import { passingDiminishedRelationships } from "../harmony/relationships/passingDiminished";
import { chromaticMediantRelationships } from "../harmony/relationships/chromaticMediant";
import { nearbyKeyRelationships } from "../harmony/relationships/nearbyKey";
import { commonToneRelationships } from "../harmony/relationships/commonTone";
import { distantKeyRelationships } from "../harmony/relationships/distantKey";

type RelationshipGenerator = (source: Chord, context: Key) => HarmonicEdge[];

/**
 * Every relationship family, in the fixed Zoom level product-spec.md §8
 * assigns it. This list is the single source of truth for "what Zoom level is
 * X" — see docs/music-engine.md for the full rationale per family.
 */
const RELATIONSHIP_GENERATORS: RelationshipGenerator[] = [
  // Zoom 1
  diatonicRelationships,
  relativeRelationships,
  functionalDominantRelationships,
  // Zoom 2
  diatonicSeventhRelationships,
  secondaryDominantRelationships,
  borrowedRelationships,
  substitutionRelationships,
  // Zoom 3
  secondaryDominantChainRelationships,
  tritoneSubstitutionRelationships,
  passingDiminishedRelationships,
  chromaticMediantRelationships,
  nearbyKeyRelationships,
  // Zoom 4
  commonToneRelationships,
  distantKeyRelationships,
];

/**
 * All relationships from `source` in `context` up to and including
 * `maxDepth` (cumulative — Zoom is a depth setting, so Zoom 2 includes Zoom 1
 * relationships too), sorted by strength descending. This is the graph's
 * primary query: "give me the most relevant Zoom N relationships from X".
 */
export function relationshipsFrom(
  source: Chord,
  context: Key,
  maxDepth: ZoomLevel,
): HarmonicEdge[] {
  const edges = RELATIONSHIP_GENERATORS.flatMap((generate) => generate(source, context)).filter(
    (edge) => edge.harmonicDepth <= maxDepth,
  );
  return edges.sort((a, b) => b.strength - a.strength);
}

/** Only the relationships newly introduced at exactly `depth` (not cumulative). */
export function relationshipsAtDepth(
  source: Chord,
  context: Key,
  depth: ZoomLevel,
): HarmonicEdge[] {
  return relationshipsFrom(source, context, depth).filter((edge) => edge.harmonicDepth === depth);
}

/**
 * Every relationship that connects `source` directly to `target` within
 * `context`, up to `maxDepth`. A chord pair can have more than one valid
 * interpretation (e.g. a chord may be reachable both as a secondary dominant
 * and, at a deeper zoom, as a chromatic mediant of something else) — this
 * returns all of them rather than picking one.
 */
export function relationshipsBetween(
  source: Chord,
  target: Chord,
  context: Key,
  maxDepth: ZoomLevel = 4,
): HarmonicEdge[] {
  return relationshipsFrom(source, context, maxDepth).filter((edge) =>
    chordsEqual(edge.target, target),
  );
}
