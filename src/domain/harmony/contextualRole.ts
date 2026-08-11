import type { Key } from "../keys/key";
import { diatonicChords } from "../keys/key";
import type { Chord } from "../chords/chord";
import { chordsEqual } from "./chordIdentity";
import { classifyFunction } from "./harmonicFunction";
import { functionalDominant, functionalLeadingToneDiminished } from "./functionalMinor";
import { diatonicSeventhChords } from "./relationships/diatonicSeventh";
import { secondaryDominantTargets } from "./relationships/secondaryDominant";
import { borrowedChords } from "./relationships/borrowed";
import type { HarmonicFunction } from "./types";

/**
 * A chord's ROLE in a tonal context — distinct from, and more specific than,
 * its `diatonic/root functional family` (harmonicFunction.ts's
 * `classifyFunction`, which is deliberately root-only and therefore
 * quality-blind). Four concepts stay separate throughout this module:
 *
 *   1. chord identity        — ../chords' `Chord` (root + quality), no context.
 *   2. diatonic/root family   — `classifyFunction`: tonic/predominant/dominant
 *                                by root position alone. A simple, always-
 *                                available fallback — NOT a claim about what
 *                                the chord is actually doing.
 *   3. contextual role        — this module: quality AND any already-detected
 *                                specific relationship (secondary dominant,
 *                                functional dominant, borrowed chord) refine
 *                                or override the root family.
 *   4. relationship to another chord — ./types' `HarmonicEdge`.
 *
 * Root position alone is not enough: C7 in C major has the same root as the
 * tonic, but its quality (dominant7, not the diatonic major triad or maj7)
 * means it is actually V7/IV, not a tonic-function chord — describing it to
 * the user as "tonic" would be musically wrong. `contextualRole` exists so
 * nothing downstream (UI copy, ../graph queries) has to fall back to the
 * root-only family for chords that already have a more specific identity.
 */
export type ContextualRoleKind =
  | HarmonicFunction
  | "secondaryDominant"
  | "functionalDominant"
  | "leadingToneDiminished"
  | "borrowed";

export interface ContextualRole {
  kind: ContextualRoleKind;
  /** Only present for `secondaryDominant`: the scale degree it tonicizes. */
  targetDegree?: number;
}

/**
 * The chord's contextual role, most specific match first:
 *
 * 1. If its quality natively matches the plain diatonic triad OR the
 *    diatonic 7th chord at its root, the root family is accurate as-is
 *    (e.g. G7 in C major really is diatonically dominant — no override
 *    needed).
 * 2. Otherwise its quality doesn't match what's natively there, so a plain
 *    root-family label would mislead — look for a specific, already-modeled
 *    reason it's an unusual quality at this root: the minor-key functional
 *    dominant/leading-tone chord, a recognized secondary dominant, or a
 *    borrowed chord.
 * 3. If nothing specific explains it, fall back to the plain root family
 *    anyway (product-spec.md §11 wants a simple, always-available label,
 *    not a hard "unknown") — e.g. Csus4 in C major has no more specific
 *    story, so "tonic" (from its root) is a reasonable simple fallback.
 *
 * Returns undefined only when the chord's root isn't even diatonic to the
 * context (nothing to say about its function at all).
 */
export function contextualRole(chord: Chord, context: Key): ContextualRole | undefined {
  const isNativelyDiatonic =
    diatonicChords(context).some((d) => chordsEqual(d.chord, chord)) ||
    diatonicSeventhChords(context).some((candidate) => chordsEqual(candidate, chord));

  if (isNativelyDiatonic) {
    const family = classifyFunction(chord, context);
    return family ? { kind: family } : undefined;
  }

  if (context.mode === "natural-minor") {
    if (chordsEqual(chord, functionalDominant(context, "dominant7"))) {
      return { kind: "functionalDominant" };
    }
    if (chordsEqual(chord, functionalLeadingToneDiminished(context, "diminished7"))) {
      return { kind: "leadingToneDiminished" };
    }
  }

  const secondary = secondaryDominantTargets(context).find((entry) =>
    chordsEqual(entry.chord, chord),
  );
  if (secondary) return { kind: "secondaryDominant", targetDegree: secondary.degree };

  if (borrowedChords(context).some((candidate) => chordsEqual(candidate, chord))) {
    return { kind: "borrowed" };
  }

  const family = classifyFunction(chord, context);
  return family ? { kind: family } : undefined;
}

/** Whether `chord`'s contextual role is plainly one of the diatonic family (not a more specific override). */
export function isPlainDiatonicFunction(chord: Chord, context: Key): boolean {
  const role = contextualRole(chord, context);
  return role?.kind === "tonic" || role?.kind === "predominant" || role?.kind === "dominant";
}
