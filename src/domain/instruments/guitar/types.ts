import type { Chord } from "../../chords/chord";
import type { PlayablePitch } from "../playablePitch";
import type { VoicingCatalogue } from "../piano/types";

export type { VoicingCatalogue };

/**
 * String numbering convention (Phase 8 §3): 6 = low E (thickest string), 1 =
 * high E (thinnest) — the standard convention used in tab and chord-diagram
 * notation. Every `GuitarVoicing.strings` array always has exactly 6
 * entries, ordered 6 → 1 (low to high).
 */
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

export const STRING_NUMBERS: readonly StringNumber[] = [6, 5, 4, 3, 2, 1];

export type StringState =
  | { status: "muted" }
  | { status: "open" }
  | { status: "fretted"; fret: number; finger?: 1 | 2 | 3 | 4 };

/** One string's contribution to the voicing — muted strings never sound and carry no pitch/interval data. */
export interface GuitarStringSound {
  string: StringNumber;
  state: StringState;
  /** The real sounding pitch (open or fretted) — absent for a muted string. */
  pitch?: PlayablePitch;
  /** The chord-formula token this pitch represents (e.g. "1", "b3", "5", "b7") — the same token vocabulary `chordIntervalFormula` already uses elsewhere, so it's universal notation, not prose. Absent for a muted string. */
  intervalToken?: string;
}

export interface BarreInfo {
  finger: 1 | 2 | 3 | 4;
  fret: number;
  /** The contiguous run of strings the barre finger presses (Phase 8 §9) — never a non-contiguous set, since a real barre finger can't skip a string. */
  strings: StringNumber[];
}

/**
 * One realistic, physically playable guitar fingering for a chord — never a
 * generic pitch-class set (Phase 8 §4). `strings` always has exactly 6
 * entries; muted/open/fretted status is explicit per string (Phase 8 §5),
 * never inferred from an absent value.
 */
export interface GuitarVoicing {
  /** Stable within one chord's voicing list (e.g. "open", "e-shape", "a-shape") — not a technical id the UI should show directly. */
  id: string;
  chord: Chord;
  /** Ordered string 6 → string 1 (low to high), always length 6. */
  strings: GuitarStringSound[];
  /** Fret span among FRETTED notes only (Phase 8 §7) — open/muted strings never affect this. */
  fretSpan: number;
  /** The lowest fret used by any fretted note; 0 for a voicing that uses no fretted note above the nut region (i.e. an open-position shape). Used for position labeling ("5th-position voicing"). */
  baseFret: number;
  barre?: BarreInfo;
  /** 0 = root in the bass, 1 = 1st inversion (bass = the formula's 2nd tone), etc. — derived from the lowest SOUNDING pitch, never from the chord symbol alone (Phase 8 §13). */
  inversion: number;
  rootPresent: boolean;
  /** "curated" = a hand-verified canonical open shape (Phase 8 §25); "generated" = produced by the candidate search. Both share this exact same data model. */
  origin: "curated" | "generated";
  catalogue: VoicingCatalogue;
}
