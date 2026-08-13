import { buildChord, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { chordsEqual } from "@/domain/harmony";
import {
  startPath,
  currentEndpoint,
  advancePath,
  goBack,
  jumpToStep,
  resetPath,
  type NavigationPath,
} from "@/domain/navigation";

/**
 * The map's interaction state (Phase R3, superseding the Phase 4
 * exploredChord/selectedChord/zoom model). Kept deliberately small and
 * framework-free so it can be unit-tested without rendering React.
 *
 * `navPath` IS the chosen exploration path (product-spec.md §30/§13) — its
 * last step is always the current endpoint. `previewChord` is the map's
 * "inspect without advancing" mechanism (Phase R3 §12): hovering/focusing a
 * candidate node sets it; clicking a chord that's already the preview
 * commits it (ADVANCE); clicking anywhere else (including the endpoint
 * itself) just changes or clears the preview. This is what keeps "clicking
 * a next-chord node advances the path directly" (§10) true while still
 * allowing lightweight inspection — the panel always shows
 * `previewChord ?? currentEndpoint(navPath)`.
 */
export interface ExplorerState {
  context: Key;
  navPath: NavigationPath;
  previewChord: Chord | null;
}

export type ExplorerAction =
  | { type: "ADVANCE"; chord: Chord }
  | { type: "PREVIEW"; chord: Chord }
  | { type: "CLEAR_PREVIEW" }
  | { type: "BACK" }
  | { type: "JUMP_TO"; index: number }
  | { type: "RESET" }
  | { type: "SET_CONTEXT"; context: Key };

function tonicTriad(context: Key): Chord {
  return buildChord(context.tonic, context.mode === "major" ? "major" : "minor");
}

export function initialExplorerState(context: Key, startingChord?: Chord): ExplorerState {
  const chord = startingChord ?? tonicTriad(context);
  return { context, navPath: startPath(chord), previewChord: null };
}

/** What the contextual side panel should show — the previewed candidate if any, otherwise the path's current endpoint. */
export function panelChord(state: ExplorerState): Chord {
  return state.previewChord ?? currentEndpoint(state.navPath);
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "ADVANCE": {
      if (chordsEqual(action.chord, currentEndpoint(state.navPath))) {
        return state.previewChord === null ? state : { ...state, previewChord: null };
      }
      return {
        ...state,
        navPath: advancePath(state.navPath, state.context, action.chord),
        previewChord: null,
      };
    }
    case "PREVIEW": {
      if (chordsEqual(action.chord, currentEndpoint(state.navPath))) {
        return state.previewChord === null ? state : { ...state, previewChord: null };
      }
      if (state.previewChord && chordsEqual(action.chord, state.previewChord)) return state;
      return { ...state, previewChord: action.chord };
    }
    case "CLEAR_PREVIEW":
      return state.previewChord === null ? state : { ...state, previewChord: null };
    case "BACK":
      return { ...state, navPath: goBack(state.navPath), previewChord: null };
    case "JUMP_TO":
      return { ...state, navPath: jumpToStep(state.navPath, action.index), previewChord: null };
    case "RESET":
      return { ...state, navPath: resetPath(tonicTriad(state.context)), previewChord: null };
    case "SET_CONTEXT":
      return initialExplorerState(action.context);
    default:
      return state;
  }
}
