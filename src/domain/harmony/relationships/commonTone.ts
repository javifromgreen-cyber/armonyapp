import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import { transposeNote } from "../../intervals/transpose";
import { buildChord, type Chord } from "../../chords/chord";
import type { ChordQualityId } from "../../chords/chordQuality";
import { chordsEqual, sharedToneCount } from "../chordIdentity";
import { borrowedChords } from "./borrowed";
import type { HarmonicEdge } from "../types";

const TRIAD_QUALITIES: readonly ChordQualityId[] = ["major", "minor"];
const REQUIRED_SHARED_TONES = 2;

/**
 * Remote root offsets (semitones from the source root) considered for
 * "deep" common-tone relationships. Excludes 0 is NOT true — 0 (the parallel
 * major/minor, e.g. C -> Cm) is deliberately included as one of the most
 * meaningful "distant but connected" relationships. Excludes 3, 4, 8, 9 (all
 * handled by ../chromaticMediant already, at Zoom 3) and 5, 7 (perfect
 * fourth/fifth root motion, which within a diatonic context always lands on
 * an already-diatonic chord).
 */
const REMOTE_OFFSETS = [0, 1, 2, 6, 10, 11];

/**
 * Zoom 4: common-tone relationships — triads at remote (non-diatonic,
 * non-mediant) root distances that nonetheless share at least 2 pitch
 * classes with the source, the hallmark of a "deep", non-functional but still
 * musically real connection (e.g. C major -> C minor, the parallel key,
 * sharing C and G).
 */
export function commonToneRelationships(source: Chord, context: Key): HarmonicEdge[] {
  const excluded = [...diatonicChords(context).map((d) => d.chord), ...borrowedChords(context)];
  const edges: HarmonicEdge[] = [];

  for (const offset of REMOTE_OFFSETS) {
    const root = transposeNote(source.root, offset);
    for (const quality of TRIAD_QUALITIES) {
      const target = buildChord(root, quality);
      if (chordsEqual(target, source)) continue;
      if (excluded.some((chord) => chordsEqual(chord, target))) continue;
      if (sharedToneCount(source, target) < REQUIRED_SHARED_TONES) continue;

      edges.push({
        source,
        target,
        relationshipType: "commonTone",
        harmonicDepth: 4,
        strength: 0.3,
        explanation: { key: "harmony.relationship.commonTone" },
        context,
      });
    }
  }

  return edges;
}
