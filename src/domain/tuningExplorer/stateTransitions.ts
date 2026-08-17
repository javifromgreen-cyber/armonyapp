import { defaultStringCountFor, isValidStringCount } from "./instrumentConfig";
import { defaultPresetFor, type TuningPreset } from "./tuningPresets";
import type { StringCount, TuningExplorerInstrument } from "./types";

/** The result of an instrument/string-count change — always a valid, standard-tuned configuration (product spec §24: "avoid impossible intermediate state"). */
export interface StandardSelection {
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  preset: TuningPreset;
}

/**
 * Switching instrument (product spec §24) always lands on that instrument's
 * OWN default standard tuning — never tries to carry over a preset/custom
 * tuning that belonged to a different instrument's string layout (e.g. an
 * Acoustic tuning has no meaningful equivalent on Bass). The string count
 * itself carries over only if it's still valid for the new instrument
 * (e.g. staying on Electric Guitar's 6 strings when switching between its
 * own configurations); otherwise it resets to that instrument's default.
 * Example: Electric Guitar 7-string -> Acoustic Guitar resolves to Acoustic
 * 6-string E Standard (Acoustic has no 7-string option).
 */
export function resolveInstrumentChange(
  newInstrument: TuningExplorerInstrument,
  currentStringCount: StringCount,
): StandardSelection {
  const stringCount = isValidStringCount(newInstrument, currentStringCount)
    ? currentStringCount
    : defaultStringCountFor(newInstrument);
  return { instrument: newInstrument, stringCount, preset: defaultPresetFor(newInstrument, stringCount) };
}

/**
 * Switching string count on the SAME instrument (product spec §24) always
 * resets to that configuration's default standard tuning too — a preset
 * chosen for 6 strings has no valid meaning once there are 7. Example:
 * Electric Guitar 6 -> 7 strings resolves to B Standard; Bass 4 -> 5
 * strings resolves to B Standard.
 */
export function resolveStringCountChange(
  instrument: TuningExplorerInstrument,
  newStringCount: StringCount,
): StandardSelection {
  return { instrument, stringCount: newStringCount, preset: defaultPresetFor(instrument, newStringCount) };
}
