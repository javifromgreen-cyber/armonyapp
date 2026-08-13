import type { Chord } from "../../chords/chord";
import type { PlayablePitch } from "../playablePitch";

/**
 * Legacy per-item catalogue metadata (Phase 7). Deliberately RETAINED
 * internally rather than removed (Phase R3.4 §16) — Armony's commercial
 * model is now a single platform-wide entitlement (72-hour trial, then
 * annual Platform Pro; see `docs/product-spec.md` §19/§25-26 and CLAUDE.md)
 * with NO item-level gating, so this label is no longer used to hide, lock,
 * or badge anything in the UI (all "free"/"pro" voicings/patterns render
 * identically and are equally reachable — confirmed via `git grep
 * '\.catalogue'` finding zero remaining UI consumers). Kept because it's
 * still a structurally cheap, harmless way to distinguish "the small
 * curated everyday set" from "the fuller generated catalogue" internally,
 * in case a future feature (e.g. a "show fewer/more voicings" density
 * toggle) wants that distinction again — but it must never be reintroduced
 * as commercial gating.
 */
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
