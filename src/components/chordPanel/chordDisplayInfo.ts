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
 * contextual role, and how it relates to whichever chord the panel is
 * currently comparing it against), kept as a pure function so it's
 * testable without React.
 */
export interface ChordDisplayInfo {
  chord: Chord;
  symbol: string;
  noteNames: string[];
  intervalFormula: readonly string[];
  contextualRole: ContextualRole | undefined;
  /** Every relationship connecting `relativeToChord` to this one. Empty when there's no `relativeToChord` (the very first chord, no predecessor yet) or it equals `chord`. */
  arrivalRelationships: HarmonicEdge[];
}

/**
 * `relativeToChord` is whichever chord the panel is currently explaining
 * `chord`'s relationship against (Phase R3.2 §38): the previous confirmed
 * chord when showing the confirmed current chord itself ("arrived via"),
 * or the confirmed current chord itself when showing a hovered/previewed
 * candidate ("relationship to current"). The caller (`ChordContextPanel`)
 * decides which; this function only needs SOME comparison chord, or
 * `undefined` at the very start (no predecessor yet). Always queries the
 * full depth range (Phase R3 removed the manual Zoom selector that used to
 * cap this).
 */
export function getChordDisplayInfo(
  chord: Chord,
  relativeToChord: Chord | undefined,
  context: Key,
): ChordDisplayInfo {
  const hasComparison = relativeToChord !== undefined && !chordsEqual(chord, relativeToChord);

  return {
    chord,
    symbol: chordSymbol(chord),
    noteNames: chordNotes(chord).map(noteName),
    intervalFormula: chordIntervalFormula(chord),
    contextualRole: contextualRole(chord, context),
    arrivalRelationships: hasComparison
      ? relationshipsBetween(relativeToChord, chord, context, ALL_DEPTHS)
      : [],
  };
}
