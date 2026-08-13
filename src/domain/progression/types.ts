import type { Chord } from "../chords/chord";

/**
 * One chord in a progression. `id` is stable across recomputation (see
 * `fromNavigationPath.ts`) so React keys and the "now playing" highlight
 * stay attached to the same logical item. Order is the array's own
 * position in `Progression.items` — no redundant index field to keep in
 * sync.
 */
export interface ProgressionItem {
  id: string;
  chord: Chord;
}

/**
 * A lightweight chord progression (product-spec.md §16, revised Phase
 * R3.3/R3.4) — not an arrangement/timeline, and (Phase R3.4) not a
 * sequencer either: no BPM, time signature, or per-item duration. Armony's
 * progression is a quick harmonic-route audition of the confirmed
 * exploration path, not a rhythmic composition tool — see
 * `docs/product-spec.md` §16's R3.4 revision.
 */
export interface Progression {
  items: ProgressionItem[];
}
