import type { HarmonicEdge } from "../harmony/types";
import { harmonicCharacterFor } from "./harmonicCharacter";
import type { HarmonicCharacter, HarmonicTerritory } from "./types";

/**
 * Deterministic `HarmonicCharacter` -> `HarmonicTerritory` mapping (Phase
 * R3.2 §24/§26) — territory is a coarser, beginner-facing grouping layered
 * ON TOP of the already-reviewed `harmonicCharacterFor` classification,
 * never a second independent rule set. This is why the deceptive-resolution
 * and major-mode-only overrides `harmonicCharacterFor` already applies
 * (verified in the R3 `music-theory-review` pass) carry through automatically
 * here — territory never re-derives from `relationshipType` or depth
 * directly, so it can't drift out of sync with the character classification.
 *
 * Rationale per territory (music-theory-review, Phase R3.2 §58):
 * - `natural`: diatonic-family motion with no added chromatic/functional
 *   pull — genuinely the most stable, common continuations in the context.
 * - `tension`: every character rooted in dominant-function pull —
 *   `strongResolution` (authentic cadence / harmonic-minor V7-i),
 *   `tension` (secondary dominants, which are tonicizations by definition),
 *   and `deceptive` (V-vi is still dominant-sourced motion; the deception
 *   is WHERE it resolves, not that the pull is absent — standard tonal
 *   harmony treats deceptive resolution as a dominant-function device).
 * - `modalColour`: borrowed/modal-interchange chords — directly what the
 *   territory name says, no reinterpretation needed.
 * - `substitution`: substitution and tritone substitution — chords whose
 *   entire modeled purpose is standing in for a more expected harmonic
 *   role.
 * - `exploration`: the remaining chromatic/remote families (passing
 *   diminished, chromatic mediant, nearby-key, common-tone, distant-key) —
 *   real relationships, but the least function-driven, most colour-for-
 *   colour's-sake ones the engine models.
 *
 * Deliberately NOT keyed by depth: a Zoom-1 diatonic chord and a
 * hypothetical (not currently modeled) Zoom-1 chromatic relationship would
 * land in different territories despite sharing a depth — territory and
 * depth are independent axes (§22), enforced structurally here since this
 * function never reads `edge.harmonicDepth` at all.
 */
const TERRITORY_BY_CHARACTER: Record<HarmonicCharacter, HarmonicTerritory> = {
  naturalContinuation: "natural",
  strongResolution: "tension",
  tension: "tension",
  deceptive: "tension",
  modalColour: "modalColour",
  substitution: "substitution",
  chromaticColour: "exploration",
  adventurous: "exploration",
};

export function harmonicTerritoryFor(edge: HarmonicEdge): HarmonicTerritory {
  return TERRITORY_BY_CHARACTER[harmonicCharacterFor(edge)];
}
