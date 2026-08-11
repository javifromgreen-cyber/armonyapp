import type { Chord } from "../../chords/chord";
import type { PlayablePitch } from "../playablePitch";

/** V1 gates by named catalogue, not a scattered plan check — Phase 11 will enforce this centrally (CLAUDE.md's entitlements rule), this module only needs to LABEL each voicing correctly. */
export type VoicingCatalogue = "free" | "pro";

export interface Fingering {
  hand: "right";
  /** Finger numbers 1 (thumb) - 5 (pinky), one per pitch, low to high, matching `PianoVoicing.pitches` order. */
  fingers: number[];
}

/**
 * One playable realization of a chord on piano — a REAL set of pitches at
 * real octaves (Phase 7 §6), not just pitch classes. `inversion` is derived
 * strictly from the bass (lowest) pitch's position in the chord's formula
 * (Phase 7 §9) — never hand-labeled per chord type.
 */
export interface PianoVoicing {
  /** Stable within one chord's voicing list (e.g. "root", "inversion1", "open") — not a technical database id the UI should ever show directly. */
  id: string;
  chord: Chord;
  /** Ascending, low to high, real octaves. */
  pitches: PlayablePitch[];
  /** 0 = root position (bass = chord root), 1 = first inversion (bass = the formula's 2nd tone), etc. */
  inversion: number;
  /** "close" = simplest ascending stack; "open" = a wider/spread variant (Phase 7 §8's "open voicings/octave displacement") — same inversion, different spread, so `inversion` alone can't distinguish them. */
  spacing: "close" | "open";
  catalogue: VoicingCatalogue;
  /** Omitted when no single fingering is reliably suggestable (Phase 7 §11) — e.g. 5-note extended chords or "open" spacing, where the comfortable fingering depends too much on the specific intervals present to guess safely. */
  fingering?: Fingering;
}
