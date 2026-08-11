import type { Chord } from "../chords/chord";
import type { Key } from "../keys/key";

/** Harmonic "Zoom" depth (product-spec.md §8) — musical depth, not visual scale. */
export type ZoomLevel = 1 | 2 | 3 | 4;

/** A chord's functional role within a tonal context. */
export type HarmonicFunction = "tonic" | "predominant" | "dominant";

export const RELATIONSHIP_TYPES = [
  "diatonic",
  "relative",
  "functionalDominant",
  "leadingToneDiminished",
  "diatonicSeventh",
  "secondaryDominant",
  "secondaryDominantChain",
  "borrowed",
  "substitution",
  "tritoneSubstitution",
  "passingDiminished",
  "chromaticMediant",
  "nearbyKey",
  "commonTone",
  "distantKey",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/**
 * A machine-readable, i18n-safe explanation: `key` resolves against the
 * `harmony.relationship.*` message namespace (added when the UI is built);
 * `params` carries interpolation data. The domain layer never emits English
 * prose — see CLAUDE.md's "no hard-coded UI copy" rule, which applies here too
 * since this layer is shared, framework-free, and must stay translatable.
 */
export interface Explanation {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * A single, meaningful harmonic relationship from one chord to another within
 * a tonal context. NODE = chord-in-context (the `source`/`target` chords plus
 * `context`); EDGE = this object (product-spec.md §29).
 */
export interface HarmonicEdge {
  source: Chord;
  target: Chord;
  relationshipType: RelationshipType;
  harmonicDepth: ZoomLevel;
  /** Relevance/strength for ranking within a zoom level, 0 (weak) to 1 (strongest). */
  strength: number;
  explanation: Explanation;
  context: Key;
}
