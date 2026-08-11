import type { Chord } from "@/domain/chords";
import type { Progression } from "@/domain/progression";

/**
 * V1 beat convention (Phase 6 §10 — documented per CLAUDE.md's "write the
 * rule down explicitly" instruction; see also docs/music-engine.md):
 *
 * `ProgressionItem.durationBeats` always means a count of QUARTER-NOTE
 * beats at the progression's BPM, regardless of `timeSignature`. One beat
 * is always `60 / bpm` seconds — 4/4, 3/4, and 6/8 do not change this
 * math. `timeSignature` is a structural/notational label only (useful
 * later for bar-grouping in a visual/notation feature); it does not
 * reinterpret beat duration (e.g. no dotted-quarter-as-a-beat compound-meter
 * handling). This is a deliberate V1 simplification — the model stays
 * extensible (nothing here assumes 4/4-only) if a more sophisticated
 * meter-aware convention is needed later.
 */
export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

export interface ScheduledChordEvent {
  itemId: string;
  chord: Chord;
  startSeconds: number;
  durationSeconds: number;
}

/**
 * Flattens a progression into an ordered, absolute-time schedule — pure and
 * Tone.js-free so it's unit-testable without any audio API. `./player.ts`
 * is the only place this gets handed to an actual scheduler.
 */
export function buildProgressionSchedule(progression: Progression): ScheduledChordEvent[] {
  const beatSeconds = secondsPerBeat(progression.bpm);
  let cursorSeconds = 0;
  const events: ScheduledChordEvent[] = [];

  for (const item of progression.items) {
    const durationSeconds = item.durationBeats * beatSeconds;
    events.push({
      itemId: item.id,
      chord: item.chord,
      startSeconds: cursorSeconds,
      durationSeconds,
    });
    cursorSeconds += durationSeconds;
  }

  return events;
}

/** Total wall-clock length of the whole progression at its current BPM. */
export function progressionDurationSeconds(progression: Progression): number {
  const beatSeconds = secondsPerBeat(progression.bpm);
  return progression.items.reduce((total, item) => total + item.durationBeats * beatSeconds, 0);
}
