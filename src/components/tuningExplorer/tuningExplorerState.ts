import type { Notation } from "@/domain/notes";
import {
  defaultPresetFor,
  presetsFor,
  resolveCustomStringMidi,
  resolveInstrumentChange,
  resolveStringCountChange,
  type StringCount,
  type TuningExplorerInstrument,
  type TuningFamily,
  type TuningPreset,
} from "@/domain/tuningExplorer";

export interface TuningExplorerState {
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  family: TuningFamily;
  /** Set whenever `family !== "custom"`. */
  presetId: string | null;
  /** Set whenever `family === "custom"` — low string -> high string, same order as a preset's `openStringsMidi`. */
  customOpenStringsMidi: number[] | null;
  notation: Notation;
}

const DEFAULT_INSTRUMENT: TuningExplorerInstrument = "electricGuitar";
const DEFAULT_STRING_COUNT: StringCount = 6;

/** Opens ready-to-use — Electric Guitar, 6 strings, E Standard, sharps (product spec §4) — never an introductory wizard. */
export function initialTuningExplorerState(): TuningExplorerState {
  const preset = defaultPresetFor(DEFAULT_INSTRUMENT, DEFAULT_STRING_COUNT);
  return {
    instrument: DEFAULT_INSTRUMENT,
    stringCount: DEFAULT_STRING_COUNT,
    family: "standard",
    presetId: preset.id,
    customOpenStringsMidi: null,
    notation: "sharp",
  };
}

export type TuningExplorerAction =
  | { type: "SET_INSTRUMENT"; instrument: TuningExplorerInstrument }
  | { type: "SET_STRING_COUNT"; stringCount: StringCount }
  | { type: "SET_FAMILY"; family: TuningFamily }
  | { type: "SET_PRESET"; presetId: string }
  | { type: "SET_CUSTOM_STRING"; stringIndex: number; pitchClass: number }
  | { type: "RESET_TO_STANDARD" }
  | { type: "SET_NOTATION"; notation: Notation };

function withStandardSelection(
  state: TuningExplorerState,
  selection: { instrument: TuningExplorerInstrument; stringCount: StringCount; preset: TuningPreset },
): TuningExplorerState {
  return {
    ...state,
    instrument: selection.instrument,
    stringCount: selection.stringCount,
    family: "standard",
    presetId: selection.preset.id,
    customOpenStringsMidi: null,
  };
}

/**
 * The whole Tuning Explorer UI-state machine (product spec §5-8/§24) — a
 * thin `useReducer` shell around the pure domain transition rules in
 * `src/domain/tuningExplorer` (`resolveInstrumentChange`/
 * `resolveStringCountChange`/`resolveCustomStringMidi`), tested directly
 * (matching this codebase's own established pattern of unit-testing
 * reducers, e.g. `src/components/map/explorerState.ts`).
 */
export function tuningExplorerReducer(
  state: TuningExplorerState,
  action: TuningExplorerAction,
): TuningExplorerState {
  switch (action.type) {
    case "SET_INSTRUMENT": {
      if (action.instrument === state.instrument) return state;
      return withStandardSelection(state, resolveInstrumentChange(action.instrument, state.stringCount));
    }
    case "SET_STRING_COUNT": {
      if (action.stringCount === state.stringCount) return state;
      return withStandardSelection(state, resolveStringCountChange(state.instrument, action.stringCount));
    }
    case "SET_FAMILY": {
      if (action.family === state.family) return state;
      if (action.family === "custom") {
        return {
          ...state,
          family: "custom",
          presetId: null,
          customOpenStringsMidi: [...currentOpenStringsMidi(state)],
        };
      }
      const firstInFamily = presetsFor(state.instrument, state.stringCount).find(
        (p) => p.family === action.family,
      );
      // familiesFor() only ever offers a family that has at least one preset for this configuration, so this is always found in practice.
      if (!firstInFamily) return state;
      return { ...state, family: action.family, presetId: firstInFamily.id, customOpenStringsMidi: null };
    }
    case "SET_PRESET": {
      const preset = presetsFor(state.instrument, state.stringCount).find((p) => p.id === action.presetId);
      if (!preset) return state;
      return { ...state, family: preset.family, presetId: preset.id, customOpenStringsMidi: null };
    }
    case "SET_CUSTOM_STRING": {
      const base = state.family === "custom" && state.customOpenStringsMidi
        ? state.customOpenStringsMidi
        : [...currentOpenStringsMidi(state)];
      const updated = [...base];
      updated[action.stringIndex] = resolveCustomStringMidi(
        state.instrument,
        state.stringCount,
        action.stringIndex,
        action.pitchClass,
      );
      return { ...state, family: "custom", presetId: null, customOpenStringsMidi: updated };
    }
    case "RESET_TO_STANDARD": {
      const preset = defaultPresetFor(state.instrument, state.stringCount);
      return { ...state, family: "standard", presetId: preset.id, customOpenStringsMidi: null };
    }
    case "SET_NOTATION": {
      if (action.notation === state.notation) return state;
      return { ...state, notation: action.notation };
    }
    default:
      return state;
  }
}

/** The active open-string MIDI array (low -> high) for whatever `state` currently represents — a preset or a custom tuning. */
export function currentOpenStringsMidi(state: TuningExplorerState): readonly number[] {
  if (state.family === "custom" && state.customOpenStringsMidi) {
    return state.customOpenStringsMidi;
  }
  const preset = presetsFor(state.instrument, state.stringCount).find((p) => p.id === state.presetId);
  return preset ? preset.openStringsMidi : defaultPresetFor(state.instrument, state.stringCount).openStringsMidi;
}

/** The active preset's canonical name, or `null` while a custom tuning is active (no canonical name to show — see product spec §20). */
export function currentPresetName(state: TuningExplorerState): string | null {
  if (state.family === "custom") return null;
  const preset = presetsFor(state.instrument, state.stringCount).find((p) => p.id === state.presetId);
  return preset ? preset.name : null;
}
