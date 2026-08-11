import { transposeChord, type Chord } from "../chords/chord";
import type { Progression, ProgressionItem, TimeSignature } from "./types";

export const DEFAULT_BPM = 90;
export const MIN_BPM = 20;
export const MAX_BPM = 300;

export const DEFAULT_TIME_SIGNATURE: TimeSignature = "4/4";

export const DEFAULT_DURATION_BEATS = 4;
export const MIN_DURATION_BEATS = 1;
export const MAX_DURATION_BEATS = 32;
/** Practical duration choices surfaced in the UI (product-spec.md §16); a custom value outside this list is still valid as long as it's within [MIN_DURATION_BEATS, MAX_DURATION_BEATS]. */
export const DURATION_CHOICES = [1, 2, 4, 8] as const;

export function createEmptyProgression(): Progression {
  return { items: [], bpm: DEFAULT_BPM, timeSignature: DEFAULT_TIME_SIGNATURE };
}

let idSuffix = 0;

/**
 * Builds a new progression item with a fresh id. Deliberately NOT called
 * from inside the reducer (see ../../components/progression/progressionReducer.ts)
 * — id generation is impure (module-level counter), and a `useReducer`
 * reducer must stay pure since React may invoke it more than once per
 * dispatch in development (Strict Mode). Callers (event handlers) build the
 * item here, then dispatch the already-constructed item.
 */
export function createProgressionItem(
  chord: Chord,
  durationBeats: number = DEFAULT_DURATION_BEATS,
): ProgressionItem {
  idSuffix += 1;
  return { id: `progression-item-${idSuffix}`, chord, durationBeats: clampDuration(durationBeats) };
}

export function addItem(progression: Progression, item: ProgressionItem): Progression {
  return { ...progression, items: [...progression.items, item] };
}

export function removeItem(progression: Progression, id: string): Progression {
  return { ...progression, items: progression.items.filter((item) => item.id !== id) };
}

/** Moves the item at `fromIndex` to `toIndex`, shifting the rest — a plain array move, no drag-library dependency. */
export function reorderItem(
  progression: Progression,
  fromIndex: number,
  toIndex: number,
): Progression {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= progression.items.length ||
    toIndex >= progression.items.length
  ) {
    return progression;
  }
  const items = [...progression.items];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return { ...progression, items };
}

export function clampDuration(durationBeats: number): number {
  return Math.min(MAX_DURATION_BEATS, Math.max(MIN_DURATION_BEATS, Math.round(durationBeats)));
}

export function setItemDuration(
  progression: Progression,
  id: string,
  durationBeats: number,
): Progression {
  const clamped = clampDuration(durationBeats);
  return {
    ...progression,
    items: progression.items.map((item) =>
      item.id === id ? { ...item, durationBeats: clamped } : item,
    ),
  };
}

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function setBpm(progression: Progression, bpm: number): Progression {
  return { ...progression, bpm: clampBpm(bpm) };
}

export function setTimeSignature(
  progression: Progression,
  timeSignature: TimeSignature,
): Progression {
  return { ...progression, timeSignature };
}

export function clearProgression(progression: Progression): Progression {
  return { ...progression, items: [] };
}

/**
 * Transposes every chord by `semitones`, using the existing context-aware
 * transposition engine (`transposeChord` -> `transposeNote`) — this already
 * spells the result by musically conventional interval (e.g. +2 semitones
 * spells C as D, a major second, never a double-sharp), never a naive
 * fixed sharp/flat table. BPM/time signature/order are untouched.
 */
export function transposeProgression(progression: Progression, semitones: number): Progression {
  if (semitones === 0) return progression;
  return {
    ...progression,
    items: progression.items.map((item) => ({
      ...item,
      chord: transposeChord(item.chord, semitones),
    })),
  };
}
