import type { NavigationPath } from "../navigation/types";
import { DEFAULT_DURATION_BEATS } from "./progression";
import type { Progression, TimeSignature } from "./types";

/**
 * Phase R3.3's core product invariant (§22/§33/§65): the active progression
 * IS the confirmed exploration path — never a second, independently-edited
 * list that could drift out of sync with it. Rather than dispatching
 * separate ADD/REMOVE actions that mirror navigation actions (and could in
 * principle desync or double-fire), `Progression.items` is derived fresh
 * from `navPath.steps` on every call — a pure projection, not stored state.
 * This alone gives every one of §23-37's required behaviors for free,
 * structurally, without any extra bookkeeping:
 *
 * - the starting chord is always item 1, automatically (§23) — `navPath`
 *   always has at least one step;
 * - a previewed candidate is never included (§24/§35-36) — `previewChord`
 *   lives outside `navPath` entirely, so it simply isn't in `steps`;
 * - confirming a candidate appends it exactly once (§25/§34) —
 *   `advancePath` pushes exactly one step, so the next call to this
 *   function derives exactly one more item, never a duplicate;
 * - Back removes exactly the last confirmed item (§27) — `goBack` pops
 *   exactly one step, and never below the starting chord (§28, already
 *   true of `goBack` itself);
 * - a root/context change resets the progression to just the new root
 *   (§29-30) — `SET_CONTEXT` rebuilds `navPath` via `initialExplorerState`,
 *   a fresh single-step path.
 *
 * Item ids are derived from the step's position, which is safe SPECIFICALLY
 * because `navPath.steps` only ever grows/shrinks at its tail (confirm
 * pushes, Back/Reset/context-change pop or replace wholesale) — it is never
 * spliced in the middle, so a given index always refers to the same
 * logical step for as long as it exists, which is all React keys or a
 * `playingItemId` comparison need (§67).
 *
 * Every derived item gets the domain's existing default duration (§66) —
 * R3.3 deliberately does not introduce new rhythmic intelligence or a
 * second per-item duration store that could itself drift from `navPath`.
 */
export function progressionFromPath(
  navPath: NavigationPath,
  bpm: number,
  timeSignature: TimeSignature,
): Progression {
  return {
    items: navPath.steps.map((step, index) => ({
      id: `nav-step-${index}`,
      chord: step.chord,
      durationBeats: DEFAULT_DURATION_BEATS,
    })),
    bpm,
    timeSignature,
  };
}
