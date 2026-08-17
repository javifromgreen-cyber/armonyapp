import type { PitchClass } from "../notes";
import { defaultPresetFor } from "./tuningPresets";
import type { StringCount, TuningExplorerInstrument } from "./types";

/**
 * The deterministic octave-inference rule for Custom tuning (product spec
 * §8): the musician picks a pitch CLASS only, never an octave — this
 * chooses the nearest MIDI pitch with that pitch class to `referenceMidi`.
 * "Nearest" ties (exactly 6 semitones away) round toward the pitch ABOVE
 * the reference, an arbitrary but fixed and documented choice — it never
 * matters for the actual product content, since no real string's standard
 * tuning sits exactly a tritone from any of the 12 pitch classes a user
 * could pick for that same string in practice, but the rule must still be
 * total and deterministic for every input.
 */
export function nearestMidiForPitchClass(referenceMidi: number, targetPitchClass: PitchClass): number {
  const referencePitchClass = ((referenceMidi % 12) + 12) % 12;
  let diff = ((targetPitchClass - referencePitchClass) % 12 + 12) % 12; // 0..11
  if (diff > 6) diff -= 12; // fold to the nearest direction; ties (diff === 6) stay positive (round up)
  return referenceMidi + diff;
}

/**
 * The FIXED per-string reference this instrument/string-count's own
 * standard tuning provides (product spec §8's "reference/current string
 * register") — never the custom tuning's own possibly-already-edited
 * value. Anchoring to the standard tuning (not the last custom value) is
 * what keeps repeated custom edits from drifting octaves further and
 * further from a sensible register over successive changes — a real risk
 * with a "reference = previous value" rule that this rule avoids by
 * construction.
 */
export function standardReferenceMidis(
  instrument: TuningExplorerInstrument,
  stringCount: StringCount,
): readonly number[] {
  return defaultPresetFor(instrument, stringCount).openStringsMidi;
}

/**
 * Rebuilds ONE string's MIDI pitch when its custom pitch class changes
 * (product spec §8: "changing any custom string must instantly rebuild the
 * entire fretboard" — this is the single-string primitive callers apply
 * per edited string; the fretboard rebuild itself is just re-running
 * `generateFretboard` with the updated `openStringsMidi` array).
 */
export function resolveCustomStringMidi(
  instrument: TuningExplorerInstrument,
  stringCount: StringCount,
  stringIndex: number,
  targetPitchClass: PitchClass,
): number {
  const reference = standardReferenceMidis(instrument, stringCount)[stringIndex];
  return nearestMidiForPitchClass(reference, targetPitchClass);
}
