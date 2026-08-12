import { noteToPitchClass, type PitchClass } from "../../notes";
import type { Chord } from "../../chords/chord";
import type { ChordQualityId } from "../../chords/chordQuality";

/**
 * A small, hand-verified set of canonical open-position shapes for the most
 * common major/minor chords (Phase 8 §25) — deliberately NOT an attempt to
 * hard-code the whole fretboard. Every fret pattern here has been checked
 * by hand against the chord's own formula (see `curatedShapes.test.ts`,
 * which cross-checks each one against `chordToneTable`). Frets are ordered
 * string 6 → string 1; `"x"` = muted.
 *
 * Deliberately limited to exactly the 8 chords product-spec Phase 8 §25
 * names as examples (C A G E D Am Em Dm) — every other quality and every
 * other root is handled by the algorithmic search in `candidates.ts`, which
 * outputs the exact same `GuitarVoicing` shape so callers never need to
 * know which origin a voicing came from.
 */
interface CuratedShape {
  rootPitchClass: PitchClass;
  qualityId: ChordQualityId;
  frets: readonly (number | "x")[];
}

const CURATED_SHAPES: readonly CuratedShape[] = [
  { rootPitchClass: 0, qualityId: "major", frets: ["x", 3, 2, 0, 1, 0] }, // C:  x32010
  { rootPitchClass: 9, qualityId: "major", frets: ["x", 0, 2, 2, 2, 0] }, // A:  x02220
  { rootPitchClass: 7, qualityId: "major", frets: [3, 2, 0, 0, 0, 3] }, // G:  320003
  { rootPitchClass: 4, qualityId: "major", frets: [0, 2, 2, 1, 0, 0] }, // E:  022100
  { rootPitchClass: 2, qualityId: "major", frets: ["x", "x", 0, 2, 3, 2] }, // D:  xx0232
  { rootPitchClass: 9, qualityId: "minor", frets: ["x", 0, 2, 2, 1, 0] }, // Am: x02210
  { rootPitchClass: 4, qualityId: "minor", frets: [0, 2, 2, 0, 0, 0] }, // Em: 022000
  { rootPitchClass: 2, qualityId: "minor", frets: ["x", "x", 0, 2, 3, 1] }, // Dm: xx0231
];

export function curatedFretsFor(chord: Chord): readonly (number | "x")[] | undefined {
  const pitchClass = noteToPitchClass(chord.root);
  return CURATED_SHAPES.find(
    (shape) => shape.rootPitchClass === pitchClass && shape.qualityId === chord.qualityId,
  )?.frets;
}
