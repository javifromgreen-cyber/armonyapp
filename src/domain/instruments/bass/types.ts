import type { Chord } from "../../chords/chord";
import type { PlayablePitch } from "../playablePitch";
import type { VoicingCatalogue } from "../piano/types";

export type { VoicingCatalogue };

/**
 * String numbering convention (Phase 9 §3): 4 = low E (thickest string), 1
 * = high G (thinnest) — mirrors Guitar's "highest number = lowest string"
 * convention for consistency across instruments, though Bass's tuning
 * table is entirely separate (see `tuning.ts`).
 */
export type BassStringNumber = 1 | 2 | 3 | 4;

export const BASS_STRING_NUMBERS: readonly BassStringNumber[] = [4, 3, 2, 1];

/**
 * One note in a bass pattern's sequence — always a REAL sounding note
 * (Phase 9 §4: a pattern has no "muted string" concept the way a guitar
 * chord voicing does, since only one string sounds at a time).
 */
export interface BassPatternStep {
  string: BassStringNumber;
  /** 0 = open string. */
  fret: number;
  pitch: PlayablePitch;
  /** The chord-formula token this note represents (e.g. "1", "b3", "5", "b7", "9") — same vocabulary `chordIntervalFormula` uses elsewhere. */
  intervalToken: string;
  /** Omitted when no fingering can be confidently suggested (Phase 9 §15) — never guessed. */
  finger?: 1 | 2 | 3 | 4;
}

/**
 * The small, deterministic V1 pattern family (Phase 9 §11):
 *   - "basicArpeggio": the primary root anchor, ascending through the
 *     chord's own tones in formula order (root→3rd/…→top tone), closing on
 *     the octave root for a plain triad (Phase 9 §9).
 *   - "alternativePosition": the same ascending idea from the OTHER
 *     practical root string (Phase 9 §13/§20) — genuine position/string
 *     diversity, not a cosmetic variant.
 *   - "rootFifthOctave": a shorter root→5th(-family)→octave route — the
 *     harmonic skeleton, skipping the 3rd/7th (Phase 9 §11).
 *   - "descendingArpeggio": the exact reverse of `basicArpeggio`'s notes,
 *     high to low.
 */
export type BassPatternType =
  | "basicArpeggio"
  | "alternativePosition"
  | "rootFifthOctave"
  | "descendingArpeggio";

/**
 * One practical way to navigate a chord on bass — a SEQUENCE through time,
 * not a simultaneous chord shape (Phase 9 §4/§1: harmony is universal,
 * execution is instrument-specific, and bass execution is navigation, not
 * a block chord). Order is significant and must never be silently
 * re-sorted by pitch.
 */
export interface BassPattern {
  /** Stable within one chord's pattern list — not a technical id the UI should show directly. */
  id: string;
  chord: Chord;
  /** Ordered exactly as the pattern is meant to be played. */
  steps: BassPatternStep[];
  patternType: BassPatternType;
  /** The string/fret this pattern is anchored to (Phase 9 §13/§18) — its starting root location; also its lowest-position reference for fret-span/fingering. */
  rootString: BassStringNumber;
  rootFret: number;
  /** Span among FRETTED (non-open) steps only, mirroring Guitar's convention — open strings never inflate this. */
  fretSpan: number;
  catalogue: VoicingCatalogue;
}

/** One chord-tone-bearing fret location, independent of any specific pattern — the local fretboard's "available chord tones" layer (Phase 9 §5/§6). */
export interface BassFretboardTone {
  string: BassStringNumber;
  fret: number;
  pitchClass: number;
  token: string;
  isRoot: boolean;
}
