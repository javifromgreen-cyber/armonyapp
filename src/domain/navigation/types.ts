import type { Chord } from "../chords/chord";
import type { HarmonicEdge, ZoomLevel } from "../harmony/types";

/**
 * A qualitative label for WHY a move works, layered on top of `ZoomLevel`
 * ("how far") — product-spec.md §30/roadmap.md Phase R3 §23. Derived
 * deterministically from real relationship metadata (`harmonicCharacter.ts`),
 * never invented per-component copy.
 */
export const HARMONIC_CHARACTERS = [
  "naturalContinuation",
  "strongResolution",
  "tension",
  "deceptive",
  "modalColour",
  "substitution",
  "chromaticColour",
  "adventurous",
] as const;

export type HarmonicCharacter = (typeof HARMONIC_CHARACTERS)[number];

/**
 * One reachable next chord from the current path endpoint. Exactly one
 * `NavigationOption` per unique chord identity even when several
 * relationships lead to it (Phase R3 §17/§37) — `relationships` keeps every
 * one of them, `primaryRelationship` (the strongest) is treated as "the
 * move" for depth/character/explanation purposes (Phase R3 §6/§7), matching
 * the convention `ChordContextPanel` already uses for its primary/secondary
 * relationship display.
 */
export interface NavigationOption {
  chord: Chord;
  relationships: HarmonicEdge[];
  primaryRelationship: HarmonicEdge;
  /** The depth of the move that would be taken to reach this chord — belongs to the relationship, not permanently to the chord (Phase R3 §6). */
  depth: ZoomLevel;
  character: HarmonicCharacter;
}

/** A ranked `NavigationOption` — same set, same membership, only reordered/scored (Phase R3 §3/§18: "ranking organizes, never deletes"). */
export interface RankedNavigationOption extends NavigationOption {
  /** Higher is more prominent. Not shown to users directly — drives sort order only. */
  contextScore: number;
}

/**
 * One stop along the exploration path. `move` is the relationship that was
 * actually taken to arrive here from the previous step — `undefined` only
 * for the very first step (the starting chord has no incoming move).
 */
export interface NavigationStep {
  chord: Chord;
  move: HarmonicEdge | undefined;
}

/** The full chosen path (Phase R3 §13) — `steps[steps.length - 1]` is always the current endpoint. */
export interface NavigationPath {
  steps: NavigationStep[];
}
