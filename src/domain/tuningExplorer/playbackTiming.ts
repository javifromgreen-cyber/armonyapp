/**
 * Pure scheduling/trigger math for Tuning Explorer's two playback actions
 * (product spec §16/§17) — framework-free, so the timing rules themselves
 * are unit-testable without a real Tone.js/Web Audio context. The actual
 * Tone.js wiring (`src/audio/tuningExplorerPlayer.ts`) reads these
 * constants/functions rather than hard-coding its own numbers.
 */

/** Delay between successive open strings — within product spec §17's 250-300ms range. */
export const OPEN_STRING_GAP_SECONDS = 0.28;

/** How long each open string (and each manually-clicked fret) sustains — product spec §16/§17's "approximately 1 second". */
export const NOTE_DURATION_SECONDS = 1.0;

export interface OpenStringStep {
  /** Index into `openStringsMidi` — 0 = lowest string, matching that array's own storage order. */
  stringIndex: number;
  midi: number;
  startSeconds: number;
}

/**
 * "Play open strings" (product spec §17): schedules every open string
 * LOWEST -> HIGHEST (the same order `openStringsMidi` is already stored
 * in — no reversal needed here; only the FRETBOARD's visual rendering
 * reverses to high-to-low, per product spec §11), each `OPEN_STRING_GAP_SECONDS`
 * after the previous one. Works identically for a preset or a custom
 * tuning, and for any string count — it only ever reads the array it's
 * given.
 */
export function scheduleOpenStrings(openStringsMidi: readonly number[]): OpenStringStep[] {
  return openStringsMidi.map((midi, stringIndex) => ({
    stringIndex,
    midi,
    startSeconds: stringIndex * OPEN_STRING_GAP_SECONDS,
  }));
}

export interface NoteTriggerEvent {
  id: string;
  startSeconds: number;
  durationSeconds: number;
}

/** Whether `event` is still sounding at `atSeconds` — a half-open interval `[start, start + duration)`. */
export function isSounding(event: NoteTriggerEvent, atSeconds: number): boolean {
  return atSeconds >= event.startSeconds && atSeconds < event.startSeconds + event.durationSeconds;
}

/**
 * Manual note playback (product spec §16) is POLYPHONIC, independent
 * triggering — never chord-building, never one note cutting off another.
 * This is the pure model of that: every trigger is an independent interval
 * on a shared timeline; `activeEventsAt` answers "what's still sounding
 * right now", which can legitimately include more than one event when
 * their intervals overlap (e.g. a second click 0.3s after the first, both
 * with ~1s duration) — proving overlap is possible by construction, not by
 * any special-casing.
 */
export function activeEventsAt(events: readonly NoteTriggerEvent[], atSeconds: number): NoteTriggerEvent[] {
  return events.filter((event) => isSounding(event, atSeconds));
}
