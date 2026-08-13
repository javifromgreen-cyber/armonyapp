import type { Chord } from "../chords/chord";
import type { Key } from "../keys/key";
import { chordsEqual } from "../harmony/chordIdentity";
import type { ZoomLevel } from "../harmony/types";
import { outgoingOptions } from "./options";
import type { NavigationPath, NavigationStep } from "./types";

/** A fresh path with `chord` as both the start and the current (only) endpoint. */
export function startPath(chord: Chord): NavigationPath {
  return { steps: [{ chord, move: undefined }] };
}

export function currentEndpoint(path: NavigationPath): Chord {
  return path.steps[path.steps.length - 1].chord;
}

/**
 * Appends `nextChord` to the path, making it the new endpoint (Phase R3
 * §10). The previous endpoint's unchosen sibling options need no explicit
 * "collapse" step — they were never part of `path`, only ever computed
 * on demand from the (now former) endpoint, so nothing to discard.
 *
 * The relationship recorded as this step's `move` is looked up fresh from
 * the CURRENT endpoint's own outgoing options — the same relationship the
 * UI displayed as "the move" before the user committed to it (primary/
 * strongest, matching `outgoingOptions`' convention) — never a stale or
 * re-derived-differently value. If `nextChord` isn't actually a valid
 * outgoing option from the current endpoint (shouldn't happen via normal
 * UI navigation), the step is still recorded, just without a `move` —
 * depth/character simply won't be displayable for that one step.
 */
export function advancePath(path: NavigationPath, context: Key, nextChord: Chord): NavigationPath {
  const endpoint = currentEndpoint(path);
  const chosen = outgoingOptions(endpoint, context).find((option) =>
    chordsEqual(option.chord, nextChord),
  );
  const step: NavigationStep = { chord: nextChord, move: chosen?.primaryRelationship };
  return { steps: [...path.steps, step] };
}

/** Steps back one move (Phase R3 §28). A no-op at the starting chord — there is nowhere earlier to go. */
export function goBack(path: NavigationPath): NavigationPath {
  if (path.steps.length <= 1) return path;
  return { steps: path.steps.slice(0, -1) };
}

/** Truncates the path back to (and including) `index` — a generalized multi-step Back, e.g. clicking an earlier breadcrumb. */
export function jumpToStep(path: NavigationPath, index: number): NavigationPath {
  if (index < 0 || index >= path.steps.length) return path;
  return { steps: path.steps.slice(0, index + 1) };
}

/** Returns exploration to a fresh starting point (Phase R3 §29) — same shape as `startPath`, named for call-site clarity. */
export function resetPath(startingChord: Chord): NavigationPath {
  return startPath(startingChord);
}

/** The depth of the move that produced the CURRENT endpoint — `undefined` at the starting chord, which has no incoming move (Phase R3 §7). */
export function currentMoveDepth(path: NavigationPath): ZoomLevel | undefined {
  return path.steps[path.steps.length - 1].move?.harmonicDepth;
}

/**
 * The deepest move depth encountered anywhere along the path so far (Phase
 * R3 §8) — `undefined` only when the path is still just its starting chord
 * (no moves taken yet). Recomputed fresh from `path.steps` every time, so
 * stepping Back past a deep move correctly lowers this value again — there
 * is no separate cached "path depth" state that could drift out of sync.
 */
export function pathDepth(path: NavigationPath): ZoomLevel | undefined {
  const depths = path.steps
    .map((step) => step.move?.harmonicDepth)
    .filter((depth): depth is ZoomLevel => depth !== undefined);
  if (depths.length === 0) return undefined;
  return Math.max(...depths) as ZoomLevel;
}
