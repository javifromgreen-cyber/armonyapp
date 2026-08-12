import type { Chord } from "../../chords/chord";
import { mod12 } from "../../notes";
import { bassChordToneTable, toneForPitchClass } from "./chordTones";
import { openStringPitchClass } from "./tuning";
import { BASS_STRING_NUMBERS, type BassFretboardTone } from "./types";

/**
 * Every chord-tone-bearing (string, fret) location within `[minFret,
 * maxFret]` across all 4 strings — independent of any specific pattern
 * (Phase 9 §5/§6's "available chord tones in the local position"). The UI
 * layer renders these subtly and separately from whichever notes the
 * CURRENTLY DISPLAYED pattern actually uses, so a bassist can see both
 * "these notes belong to the chord" and "this is the route this pattern
 * takes" at once.
 */
export function localChordToneMap(chord: Chord, minFret: number, maxFret: number): BassFretboardTone[] {
  const tones = bassChordToneTable(chord);
  const rootPitchClass = tones[0].pitchClass;
  const result: BassFretboardTone[] = [];

  for (const stringNumber of BASS_STRING_NUMBERS) {
    const openPitchClass = openStringPitchClass(stringNumber);
    for (let fret = minFret; fret <= maxFret; fret++) {
      const pitchClass = mod12(openPitchClass + fret);
      const tone = toneForPitchClass(tones, pitchClass);
      if (!tone) continue;
      result.push({
        string: stringNumber,
        fret,
        pitchClass,
        token: tone.token,
        isRoot: pitchClass === rootPitchClass,
      });
    }
  }

  return result;
}
