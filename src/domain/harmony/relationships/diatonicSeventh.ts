import type { Key } from "../../keys/key";
import { keyScaleNotes } from "../../keys/key";
import { mod12 } from "../../notes/pitchClass";
import { noteToPitchClass } from "../../notes/note";
import { buildChord, type Chord } from "../../chords/chord";
import type { ChordQualityId } from "../../chords/chordQuality";
import { chordsEqual } from "../chordIdentity";
import type { HarmonicEdge } from "../types";

/**
 * Classifies a diatonic 7th chord's quality from the (third, fifth, seventh)
 * intervals above its root — generalizing the same "stack thirds within the
 * scale, then classify by interval pattern" approach ../../keys/key.ts uses
 * for triads, one third further. Only the patterns that actually occur when
 * stacking within a major or natural-minor scale are handled; anything else
 * is a bug (there are exactly 7 degrees x 2 modes to ever hit this).
 */
const SEVENTH_QUALITY_BY_INTERVALS: Record<string, ChordQualityId> = {
  "4,7,11": "maj7",
  "4,7,10": "dominant7",
  "3,7,10": "minor7",
  "3,6,10": "minor7flat5",
  "3,6,9": "diminished7",
};

function classifySeventhQuality(
  thirdInterval: number,
  fifthInterval: number,
  seventhInterval: number,
): ChordQualityId {
  const quality =
    SEVENTH_QUALITY_BY_INTERVALS[`${thirdInterval},${fifthInterval},${seventhInterval}`];
  if (!quality) {
    throw new Error(
      `Unrecognized diatonic seventh-chord interval pattern (${thirdInterval}, ${fifthInterval}, ${seventhInterval}).`,
    );
  }
  return quality;
}

/** The 7 diatonic seventh chords of a key, in scale-degree order. */
export function diatonicSeventhChords(context: Key): Chord[] {
  const scale = keyScaleNotes(context);
  const pitchClasses = scale.map(noteToPitchClass);

  return scale.map((root, index) => {
    const thirdIndex = (index + 2) % 7;
    const fifthIndex = (index + 4) % 7;
    const seventhIndex = (index + 6) % 7;
    const thirdInterval = mod12(pitchClasses[thirdIndex] - pitchClasses[index]);
    const fifthInterval = mod12(pitchClasses[fifthIndex] - pitchClasses[index]);
    const seventhInterval = mod12(pitchClasses[seventhIndex] - pitchClasses[index]);
    const quality = classifySeventhQuality(thirdInterval, fifthInterval, seventhInterval);
    return buildChord(root, quality);
  });
}

/**
 * Zoom 2: "common sevenths/extensions supported by the chord catalogue"
 * (product-spec.md §8) — the diatonic triads' natural 7th-chord upgrades
 * (e.g. C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5).
 */
export function diatonicSeventhRelationships(source: Chord, context: Key): HarmonicEdge[] {
  return diatonicSeventhChords(context)
    .filter((target) => !chordsEqual(target, source))
    .map((target) => ({
      source,
      target,
      relationshipType: "diatonicSeventh",
      harmonicDepth: 2,
      strength: 0.7,
      explanation: { key: "harmony.relationship.diatonicSeventh" },
      context,
    }));
}
