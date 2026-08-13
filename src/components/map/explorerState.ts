import { buildChord, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { chordsEqual } from "@/domain/harmony";
import { startPath, currentEndpoint, advancePath, goBack, resetPath, type NavigationPath } from "@/domain/navigation";

/**
 * The map's interaction state (Phase R3.2, reintroducing a preview step on
 * top of R3.1's foundations — R3.1's own single-click-does-everything
 * model turned out to remove the ability to audition/compare candidates
 * before committing). `navPath` is the CONFIRMED exploration/navigation
 * history — kept internally for Back and contextual ranking, never
 * rendered as a visible progression-like chain (product-spec.md §30).
 * `previewChord` is a candidate the user has clicked ONCE but not yet
 * confirmed — it is NOT part of navigation history and never touches
 * ranking/Back until confirmed.
 *
 * The interaction (Phase R3.2 §1-8): first activation of a candidate ->
 * `PREVIEW` (auditions confirmed-path + candidate, does not navigate).
 * Activating a DIFFERENT candidate while one is previewed -> another
 * `PREVIEW` (switches, cancels the old audition). Activating the SAME
 * already-previewed candidate again -> `CONFIRM` (commits it to `navPath`,
 * clears the preview, does not replay audio — it was already heard during
 * preview). This is persistent UI state, never a double-click/timer.
 *
 * Hover/focus is a separate, purely silent, informational-only concern —
 * it lives as local component state in `HarmonicMap`/`ExplorerApp`, never
 * here, since it must never trigger audio or touch this reducer at all.
 */
export interface ExplorerState {
  context: Key;
  navPath: NavigationPath;
  previewChord: Chord | null;
}

export type ExplorerAction =
  | { type: "PREVIEW"; chord: Chord }
  | { type: "CONFIRM"; chord: Chord }
  | { type: "CLEAR_PREVIEW" }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "SET_CONTEXT"; context: Key };

function tonicTriad(context: Key): Chord {
  return buildChord(context.tonic, context.mode === "major" ? "major" : "minor");
}

export function initialExplorerState(context: Key, startingChord?: Chord): ExplorerState {
  const chord = startingChord ?? tonicTriad(context);
  return { context, navPath: startPath(chord), previewChord: null };
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "PREVIEW": {
      if (chordsEqual(action.chord, currentEndpoint(state.navPath))) return state; // the current chord isn't a candidate to preview
      if (state.previewChord && chordsEqual(action.chord, state.previewChord)) return state; // already previewing this one
      return { ...state, previewChord: action.chord };
    }
    case "CONFIRM": {
      // Only ever confirms the currently-active preview — a defensive
      // guard against a stale/mismatched activation, never expected to
      // matter in normal use since the caller only dispatches CONFIRM when
      // it already knows `action.chord` is the active preview.
      if (!state.previewChord || !chordsEqual(action.chord, state.previewChord)) return state;
      return {
        ...state,
        navPath: advancePath(state.navPath, state.context, action.chord),
        previewChord: null,
      };
    }
    case "CLEAR_PREVIEW":
      return state.previewChord === null ? state : { ...state, previewChord: null };
    case "BACK":
      return { ...state, navPath: goBack(state.navPath), previewChord: null };
    case "RESET":
      return { ...state, navPath: resetPath(tonicTriad(state.context)), previewChord: null };
    case "SET_CONTEXT":
      return initialExplorerState(action.context);
    default:
      return state;
  }
}
