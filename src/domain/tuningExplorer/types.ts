/**
 * Tuning Explorer (ONA app #2) — core vocabulary. Deliberately a SEPARATE
 * set of types from Armony's `src/domain/instruments/guitar|bass` (which
 * models chord-voicing generation for a single fixed standard tuning) —
 * genuinely different concerns; this module only reuses the truly shared
 * primitives (`src/domain/notes`, `playablePitch`'s MIDI/frequency math).
 */
export type TuningExplorerInstrument = "electricGuitar" | "acousticGuitar" | "bass";

/** v1 supported string counts — see `instrumentConfig.ts` for which apply to which instrument. */
export type StringCount = 4 | 5 | 6 | 7;

export type TuningFamily = "standard" | "drop" | "open" | "alternate" | "custom";

export const TUNING_FAMILIES: readonly TuningFamily[] = ["standard", "drop", "open", "alternate", "custom"];
