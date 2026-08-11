import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import { transposeNote } from "../../intervals/transpose";
import { buildChord, type Chord } from "../../chords/chord";
import type { ChordQualityId } from "../../chords/chordQuality";
import { chordsEqual, sharedToneCount } from "../chordIdentity";
import { borrowedChords } from "./borrowed";
import type { HarmonicEdge } from "../types";

/** Major and minor third, both directions. */
const THIRD_OFFSETS = [3, 4, -3, -4];
const TRIAD_QUALITIES: readonly ChordQualityId[] = ["major", "minor"];
const REQUIRED_SHARED_TONES = 1;

/**
 * Zoom 3: chromatic mediants — triads a third (major or minor, either
 * direction) from the source chord's root that are NOT already diatonic to
 * the context (or already claimed by ../borrowed, e.g. bIII/bVI, which are
 * mediant-related by root motion too but get the more specific "borrowed"
 * label instead of a redundant second edge), sharing exactly one common tone
 * with the source. Exactly one shared tone is the defining feature that
 * distinguishes a "true" chromatic mediant from an ordinary diatonic third
 * relationship (which typically shares two). E.g. from C major in C major:
 * E major and A major each share only the note that gives the chord its glow.
 */
export function chromaticMediantRelationships(source: Chord, context: Key): HarmonicEdge[] {
  const excluded = [...diatonicChords(context).map((d) => d.chord), ...borrowedChords(context)];
  const edges: HarmonicEdge[] = [];

  for (const offset of THIRD_OFFSETS) {
    const root = transposeNote(source.root, offset);
    for (const quality of TRIAD_QUALITIES) {
      const target = buildChord(root, quality);
      if (excluded.some((chord) => chordsEqual(chord, target))) continue;
      if (sharedToneCount(source, target) !== REQUIRED_SHARED_TONES) continue;

      edges.push({
        source,
        target,
        relationshipType: "chromaticMediant",
        harmonicDepth: 3,
        strength: 0.4,
        explanation: { key: "harmony.relationship.chromaticMediant" },
        context,
      });
    }
  }

  return edges;
}
