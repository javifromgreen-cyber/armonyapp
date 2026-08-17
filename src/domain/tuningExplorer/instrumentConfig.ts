import type { StringCount, TuningExplorerInstrument } from "./types";

/**
 * v1's fixed instrument/string-count/fret-count matrix (product spec §3) —
 * the single source of truth for "which string counts are valid for this
 * instrument" and "how many frets does it have". Adding a future string
 * count (e.g. 8-string guitar) is a one-line addition here; nothing else
 * hard-codes these numbers.
 */
export interface InstrumentConfig {
  instrument: TuningExplorerInstrument;
  stringCounts: readonly StringCount[];
  maxFret: number;
}

export const INSTRUMENT_CONFIGS: Record<TuningExplorerInstrument, InstrumentConfig> = {
  electricGuitar: { instrument: "electricGuitar", stringCounts: [6, 7], maxFret: 24 },
  acousticGuitar: { instrument: "acousticGuitar", stringCounts: [6], maxFret: 22 },
  bass: { instrument: "bass", stringCounts: [4, 5], maxFret: 24 },
};

export function isValidStringCount(instrument: TuningExplorerInstrument, stringCount: number): stringCount is StringCount {
  return (INSTRUMENT_CONFIGS[instrument].stringCounts as readonly number[]).includes(stringCount);
}

export function maxFretFor(instrument: TuningExplorerInstrument): number {
  return INSTRUMENT_CONFIGS[instrument].maxFret;
}

/** The default string count for an instrument — its FIRST configured count (electricGuitar/acousticGuitar → 6, bass → 4), matching product spec §4's default state. */
export function defaultStringCountFor(instrument: TuningExplorerInstrument): StringCount {
  return INSTRUMENT_CONFIGS[instrument].stringCounts[0];
}
