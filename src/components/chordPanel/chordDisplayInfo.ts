import {
  chordSymbol,
  chordNotes,
  chordIntervalFormula,
  type Chord,
} from "@/domain/chords";
import { noteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import {
  contextualRole,
  chordsEqual,
  type ContextualRole,
  type HarmonicEdge,
} from "@/domain/harmony";
import { relationshipsBetween } from "@/domain/graph";

/** Phase R3 removes the manual Zoom selector — every depth the engine models is always queryable. */
const ALL_DEPTHS = 4;

/**
 * Everything the contextual side panel needs for a chord — a thin,
 * presentation-shaped combination of domain queries (chord identity, its
 * contextual role, and how it relates to the chord immediately before it
 * in navigation history), kept as a pure function so it's testable without
 * React.
 */
export interface ChordDisplayInfo {
  chord: Chord;
  symbol: string;
  noteNames: string[];
  intervalFormula: readonly string[];
  contextualRole: ContextualRole | undefined;
  /** Every relationship connecting the previous chord in navigation history to this one — how we arrived here. Empty at the very start (no previous chord yet). */
  arrivalRelationships: HarmonicEdge[];
}

/**
 * `previousChord` is the chord immediately before `chord` in navigation
 * history (Phase R3.1 — the panel always shows the CURRENT chord now,
 * there is no separate "previewed candidate" concept; `previousChord` is
 * `undefined` only for the very first chord, which has no predecessor).
 * Always queries the full depth range (Phase R3 removed the manual Zoom
 * selector that used to cap this).
 */
export function getChordDisplayInfo(
  chord: Chord,
  previousChord: Chord | undefined,
  context: Key,
): ChordDisplayInfo {
  const hasPredecessor = previousChord !== undefined && !chordsEqual(chord, previousChord);

  return {
    chord,
    symbol: chordSymbol(chord),
    noteNames: chordNotes(chord).map(noteName),
    intervalFormula: chordIntervalFormula(chord),
    contextualRole: contextualRole(chord, context),
    arrivalRelationships: hasPredecessor
      ? relationshipsBetween(previousChord, chord, context, ALL_DEPTHS)
      : [],
  };
}
