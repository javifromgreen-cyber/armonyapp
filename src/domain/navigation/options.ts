import type { Chord } from "../chords/chord";
import type { Key } from "../keys/key";
import { relationshipsFrom } from "../graph/harmonicGraph";
import { groupRelationshipsByTarget, type MapGraphNode } from "../graph/mapGraph";
import { harmonicCharacterFor } from "./harmonicCharacter";
import type { NavigationOption } from "./types";

/**
 * All depths the engine currently models — Phase R3 removes the manual
 * Zoom 1-4 selector as an exploration prerequisite (product-spec.md §4/§34):
 * every valid outgoing possibility is always available, ranking (not depth
 * filtering) is what organizes them. `ZoomLevel` metadata survives per-move
 * (see `NavigationOption.depth`) purely as descriptive information.
 */
const ALL_DEPTHS = 4;

function toNavigationOption(node: MapGraphNode): NavigationOption {
  return {
    chord: node.chord,
    relationships: node.relationships,
    primaryRelationship: node.primaryRelationship,
    depth: node.primaryRelationship.harmonicDepth,
    character: harmonicCharacterFor(node.primaryRelationship),
  };
}

/**
 * Every valid next chord reachable from `chord` in `context`, one option per
 * unique chord identity (Phase R3 §17) — deliberately reuses
 * `relationshipsFrom`/`groupRelationshipsByTarget` (the same completeness-
 * preserving grouping the Phase 4 map already relied on) rather than
 * re-deriving the harmony engine's output; this function only adds the
 * depth/character metadata a "move" needs on top (§6/§23).
 *
 * Completeness guarantee (Phase R3 §36): the set of chord identities
 * returned here always equals the deduplicated target set of
 * `relationshipsFrom(chord, context, 4)` — see `options.test.ts`.
 */
export function outgoingOptions(chord: Chord, context: Key): NavigationOption[] {
  const edges = relationshipsFrom(chord, context, ALL_DEPTHS);
  return groupRelationshipsByTarget(edges).map(toNavigationOption);
}
