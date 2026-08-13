import { buildChord, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { chordsEqual } from "@/domain/harmony";
import { startPath, currentEndpoint, advancePath, goBack, resetPath, type NavigationPath } from "@/domain/navigation";

/**
 * The map's interaction state (Phase R3.1, superseding R3's own
 * preview/advance two-step model). `navPath` IS the exploration/navigation
 * history — kept internally for Back and contextual ranking, never
 * rendered as a visible progression-like chain (product-spec.md §30,
 * revised R3.1 §2-4: this is NAVIGATION HISTORY, not the composed
 * progression, which lives entirely in its own separate reducer).
 *
 * There is no separate "preview" state anymore: a single click/tap on a
 * valid destination chord both plays the transition and commits it as the
 * new endpoint in one action (§5/§6/§10) — inspecting a candidate silently
 * (hover/focus, §29) is optional, purely visual, and lives as local
 * component state in `HarmonicMap`, never here, since it never needs to
 * survive a re-render or affect Back/ranking.
 */
export interface ExplorerState {
  context: Key;
  navPath: NavigationPath;
}

export type ExplorerAction =
  | { type: "ADVANCE"; chord: Chord }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "SET_CONTEXT"; context: Key };

function tonicTriad(context: Key): Chord {
  return buildChord(context.tonic, context.mode === "major" ? "major" : "minor");
}

export function initialExplorerState(context: Key, startingChord?: Chord): ExplorerState {
  const chord = startingChord ?? tonicTriad(context);
  return { context, navPath: startPath(chord) };
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "ADVANCE": {
      if (chordsEqual(action.chord, currentEndpoint(state.navPath))) return state;
      return { ...state, navPath: advancePath(state.navPath, state.context, action.chord) };
    }
    case "BACK":
      return { ...state, navPath: goBack(state.navPath) };
    case "RESET":
      return { ...state, navPath: resetPath(tonicTriad(state.context)) };
    case "SET_CONTEXT":
      return initialExplorerState(action.context);
    default:
      return state;
  }
}
