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

/**
 * Everything the contextual side panel needs for a chord — a thin,
 * presentation-shaped combination of domain queries (chord identity, its
 * contextual role, and its relationship to the currently explored/source
 * chord), kept as a pure function so it's testable without React. No
 * instrument content (guitar/piano/bass) yet — that's Phase 7-9; this panel
 * is deliberately shaped to have room for it later.
 */
export interface ChordDisplayInfo {
  chord: Chord;
  symbol: string;
  noteNames: string[];
  intervalFormula: readonly string[];
  contextualRole: ContextualRole | undefined;
  /** Empty when `chord` IS the explored/source chord (nothing to relate it to). */
  relationshipsFromSource: HarmonicEdge[];
}

export function getChordDisplayInfo(
  chord: Chord,
  sourceChord: Chord,
  context: Key,
): ChordDisplayInfo {
  const isSource = chordsEqual(chord, sourceChord);

  return {
    chord,
    symbol: chordSymbol(chord),
    noteNames: chordNotes(chord).map(noteName),
    intervalFormula: chordIntervalFormula(chord),
    contextualRole: contextualRole(chord, context),
    relationshipsFromSource: isSource
      ? []
      : relationshipsBetween(sourceChord, chord, context, 4),
  };
}
