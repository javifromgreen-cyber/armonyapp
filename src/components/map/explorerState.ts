import { buildChord, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import type { ZoomLevel } from "@/domain/harmony";

/**
 * The map's interaction state, kept deliberately small and framework-free so
 * it can be unit-tested without rendering React. Two chords are tracked on
 * purpose, preserving the product's core interaction rule (product-spec.md
 * §7): `selectedChord` is "what the contextual panel is showing" and
 * `exploredChord` is "what the map is centered on" — selecting a chord must
 * never silently recenter the map.
 */
export interface ExplorerState {
  context: Key;
  exploredChord: Chord;
  selectedChord: Chord;
  zoom: ZoomLevel;
}

export type ExplorerAction =
  | { type: "SELECT"; chord: Chord }
  | { type: "EXPLORE"; chord: Chord }
  | { type: "SET_ZOOM"; zoom: ZoomLevel }
  | { type: "SET_CONTEXT"; context: Key };

function tonicTriad(context: Key): Chord {
  return buildChord(context.tonic, context.mode === "major" ? "major" : "minor");
}

export function initialExplorerState(context: Key, startingChord?: Chord): ExplorerState {
  const chord = startingChord ?? tonicTriad(context);
  return { context, exploredChord: chord, selectedChord: chord, zoom: 1 };
}

/**
 * SELECT never touches `exploredChord`/`zoom` (inspecting a chord must not
 * recenter the map or change what's queried). EXPLORE recenters the map and,
 * since you're now looking at that chord's own neighborhood, also becomes
 * the selection. Changing the key resets both to the new key's tonic — the
 * previous chord may not even be meaningful in the new context.
 */
export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedChord: action.chord };
    case "EXPLORE":
      return { ...state, exploredChord: action.chord, selectedChord: action.chord };
    case "SET_ZOOM":
      return { ...state, zoom: action.zoom };
    case "SET_CONTEXT":
      return initialExplorerState(action.context);
    default:
      return state;
  }
}
