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
  type ZoomLevel,
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

/**
 * `activeDepth` is the currently active harmonic Zoom — the same value the
 * map itself queries with (`HarmonicMap`'s `relationshipsFrom(..., zoom)`).
 * The panel must never show a relationship deeper than what's actually
 * visible on the map (e.g. a Zoom-2 "Substitute chord" leaking into the
 * panel while the map is at Zoom 1 — see docs/roadmap.md Phase 4.2). Once
 * the entitlement system caps the zoom a user can reach
 * (`maxAllowedHarmonicDepth`, Phase 11), that cap is enforced by clamping
 * `activeDepth` itself before it ever reaches this function — so this stays
 * a single, always-correct `min(activeHarmonicDepth, maxAllowedHarmonicDepth)`
 * without this function needing to know about entitlements at all.
 */
export function getChordDisplayInfo(
  chord: Chord,
  sourceChord: Chord,
  context: Key,
  activeDepth: ZoomLevel,
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
      : relationshipsBetween(sourceChord, chord, context, activeDepth),
  };
}
