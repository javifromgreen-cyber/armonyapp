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

/**
 * `sourceChord` is the map's current path endpoint (Phase R3) — this panel
 * shows `chord`'s relationship TO that endpoint. Phase R3 removes the
 * manual Zoom selector: every depth the engine models is always shown on
 * the map, so this always queries the full depth range too (no cap to stay
 * in sync with a zoom control that no longer exists). Once the entitlement
 * system gates account-level access (Phase 11), that's enforced elsewhere
 * (§9's account-access-level gating, never a per-relationship depth cap
 * here).
 */
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
      : relationshipsBetween(sourceChord, chord, context, ALL_DEPTHS),
  };
}
