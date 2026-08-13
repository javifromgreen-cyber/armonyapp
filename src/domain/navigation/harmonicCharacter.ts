import type { HarmonicEdge, RelationshipType } from "../harmony/types";
import { classifyFunction, diatonicDegreeOf } from "../harmony/harmonicFunction";
import type { HarmonicCharacter } from "./types";

/** Scale degree of the submediant (vi in major, VI in minor) — the classic deceptive-resolution target. */
const SUBMEDIANT_DEGREE = 6;
/** Scale degree of the tonic itself. */
const TONIC_DEGREE = 1;

/**
 * Deterministic relationship-type -> character mapping (Phase R3 §23). Every
 * `RelationshipType` the engine models gets exactly one baseline character;
 * see the `deceptive` override below for the one context-sensitive
 * refinement. This is a categorization of relationship families that
 * already carry these musical meanings (see docs/music-engine.md for each
 * family's rationale) — not new music theory invented here.
 */
const CHARACTER_BY_TYPE: Record<RelationshipType, HarmonicCharacter> = {
  diatonic: "naturalContinuation",
  relative: "naturalContinuation",
  diatonicSeventh: "naturalContinuation",
  functionalDominant: "strongResolution",
  leadingToneDiminished: "strongResolution",
  secondaryDominant: "tension",
  secondaryDominantChain: "tension",
  borrowed: "modalColour",
  substitution: "substitution",
  tritoneSubstitution: "substitution",
  passingDiminished: "chromaticColour",
  chromaticMediant: "chromaticColour",
  nearbyKey: "chromaticColour",
  commonTone: "adventurous",
  distantKey: "adventurous",
};

/**
 * `edge`'s harmonic character. Two overrides on top of the baseline table,
 * both scoped to the generic `diatonic` relationship type (the family that
 * covers major-key V-I motion — `functionalDominant` is reserved by the
 * domain layer for the harmonic-minor-derived dominant, so major keys'
 * authentic cadence needs its own detection here rather than relying on
 * `relationshipType` alone):
 *
 * 1. FROM a dominant-function chord (V or vii°) TO the true tonic (degree
 *    1) is the authentic cadence — the textbook strong resolution
 *    (product-spec.md §24's own "G7 ... Strong resolution" example).
 * 2. FROM a dominant-function chord TO the submediant (vi/VI) instead is
 *    the classic "deceptive resolution" (V -> vi) — a real, named
 *    harmonic device, not an invented category.
 *
 * Both are MAJOR-MODE only. `classifyFunction`'s degree-based table
 * (../harmony/harmonicFunction.ts) deliberately classifies natural minor's
 * degree-5/7 chords (v, bVII) as "dominant" too, by its own documented
 * simplification — but those are the NATURAL (non-leading-tone) minor
 * dominant/subtonic, without the pull that makes V-I or V-vi read as
 * strong/deceptive (e.g. G -> Am in A natural minor is a common, but
 * harmonically mild, bVII-i motion, not an authentic-cadence-style
 * resolution). The engine's genuinely strong minor-key dominant — the
 * harmonic-minor-derived V7/vii°, e.g. E7 -> Am in A minor — is already
 * tagged `functionalDominant`/`leadingToneDiminished` and gets
 * `strongResolution` from the baseline table above without needing this
 * override at all. Both are detected from the existing `classifyFunction`/
 * `diatonicDegreeOf` domain queries, never a new music-theory rule.
 */
export function harmonicCharacterFor(edge: HarmonicEdge): HarmonicCharacter {
  if (edge.relationshipType === "diatonic" && edge.context.mode === "major") {
    const sourceFunction = classifyFunction(edge.source, edge.context);
    if (sourceFunction === "dominant") {
      const targetDegree = diatonicDegreeOf(edge.target, edge.context);
      if (targetDegree === TONIC_DEGREE) return "strongResolution";
      if (targetDegree === SUBMEDIANT_DEGREE) return "deceptive";
    }
  }
  return CHARACTER_BY_TYPE[edge.relationshipType];
}
