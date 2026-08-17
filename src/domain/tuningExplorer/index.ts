export type { TuningExplorerInstrument, StringCount, TuningFamily } from "./types";
export { TUNING_FAMILIES } from "./types";
export {
  INSTRUMENT_CONFIGS,
  isValidStringCount,
  maxFretFor,
  defaultStringCountFor,
  type InstrumentConfig,
} from "./instrumentConfig";
export { TUNING_PRESETS, presetsFor, familiesFor, defaultPresetFor, type TuningPreset } from "./tuningPresets";
export { generateFretboard, pitchAt, displayNameFor, type FretPosition } from "./fretboard";
export {
  nearestMidiForPitchClass,
  standardReferenceMidis,
  resolveCustomStringMidi,
} from "./customTuning";
export { resolveInstrumentChange, resolveStringCountChange, type StandardSelection } from "./stateTransitions";
export {
  OPEN_STRING_GAP_SECONDS,
  NOTE_DURATION_SECONDS,
  scheduleOpenStrings,
  isSounding,
  activeEventsAt,
  type OpenStringStep,
  type NoteTriggerEvent,
} from "./playbackTiming";
