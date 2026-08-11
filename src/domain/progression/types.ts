import type { Chord } from "../chords/chord";

/**
 * v1 supports the three signatures product-spec.md §9 calls out as
 * immediately useful; the architecture (a plain string union) allows more
 * later without a data-model change.
 */
export const TIME_SIGNATURES = ["4/4", "3/4", "6/8"] as const;
export type TimeSignature = (typeof TIME_SIGNATURES)[number];

/**
 * One chord in a progression. `id` is stable across edits (reorder/duration
 * changes never generate a new one) so React keys and future persistence
 * rows stay attached to the same logical item. Order is the array's own
 * position in `Progression.items` — no redundant index field to keep in
 * sync; a future persisted `position` column (see architecture.md's
 * `progression_chords` table) is derived from array order at save time.
 */
export interface ProgressionItem {
  id: string;
  chord: Chord;
  durationBeats: number;
}

/**
 * A lightweight chord progression (product-spec.md §16) — not an
 * arrangement/timeline. `context` (the harmonic map's key) is deliberately
 * NOT part of this type: the progression is a related but separate concern
 * from the map's current key context (product-spec.md §16's "chromatic
 * progressions" allowance) and must survive the user changing keys on the
 * map.
 */
export interface Progression {
  items: ProgressionItem[];
  bpm: number;
  timeSignature: TimeSignature;
}
