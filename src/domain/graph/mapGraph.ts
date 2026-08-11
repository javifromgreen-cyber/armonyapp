import type { Chord } from "../chords/chord";
import { chordIdentityKey } from "../harmony/chordIdentity";
import type { HarmonicEdge, ZoomLevel } from "../harmony/types";

/**
 * One visible map node per unique chord identity — the harmonic map must
 * never render two nodes for the same chord just because more than one
 * relationship connects it to the source (e.g. C -> Am is simultaneously
 * diatonic, relative, and substitution; product-spec.md and architecture.md
 * both require exactly one Am node). All applicable relationships are kept
 * on `relationships`, sorted strongest-first, so the UI can show a primary
 * relationship plus indicators for the rest without losing information.
 */
export interface MapGraphNode {
  chord: Chord;
  /** Every relationship from the source to this chord, strongest first. */
  relationships: HarmonicEdge[];
  /** The strongest relationship — used for the node's primary visual treatment. */
  primaryRelationship: HarmonicEdge;
  /**
   * The shallowest Zoom level at which this chord becomes reachable. A chord
   * reachable via more than one relationship at different depths (e.g. both
   * Zoom 1 and Zoom 2) is positioned/introduced at the shallower one — it
   * doesn't visually "retreat" outward just because a deeper relationship
   * also applies.
   */
  introducedAtDepth: ZoomLevel;
}

/**
 * Groups a flat list of edges (as returned by ../graph/harmonicGraph's
 * `relationshipsFrom`) by target chord identity, producing exactly one
 * MapGraphNode per unique chord. Pure and framework-free — the actual SVG
 * layout (positions, angles) is a presentation concern that lives in the UI
 * layer, not here.
 */
export function groupRelationshipsByTarget(edges: HarmonicEdge[]): MapGraphNode[] {
  const byTarget = new Map<string, HarmonicEdge[]>();

  for (const edge of edges) {
    const key = chordIdentityKey(edge.target);
    const existing = byTarget.get(key);
    if (existing) {
      existing.push(edge);
    } else {
      byTarget.set(key, [edge]);
    }
  }

  return [...byTarget.values()].map((relationships) => {
    const sorted = [...relationships].sort((a, b) => b.strength - a.strength);
    const introducedAtDepth = sorted.reduce(
      (min, edge) => (edge.harmonicDepth < min ? edge.harmonicDepth : min),
      sorted[0].harmonicDepth,
    );
    return {
      chord: sorted[0].target,
      relationships: sorted,
      primaryRelationship: sorted[0],
      introducedAtDepth,
    };
  });
}
