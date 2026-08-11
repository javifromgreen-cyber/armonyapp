import type { Key } from "../../keys/key";
import { noteAtScaleDegree, type ScaleDegree } from "../../intervals/scaleDegree";
import { buildChord, type Chord } from "../../chords/chord";
import type { ChordQualityId } from "../../chords/chordQuality";
import { isTonic } from "../harmonicFunction";
import type { Explanation, HarmonicEdge, ZoomLevel } from "../types";

interface BorrowedChordSpec {
  degree: ScaleDegree;
  quality: ChordQualityId;
  explanationKey: string;
  depth: ZoomLevel;
  strength: number;
}

/**
 * Chords borrowed from the parallel natural-minor into a major key. Anchored
 * only at the tonic (product-spec.md's paywall UX wants a bounded, curated
 * set, not every borrowable chord fanning out from everywhere) — degree/
 * quality pairs are computed generically via scale-degree math, never
 * hardcoded per key.
 */
const MAJOR_BORROWS_FROM_MINOR: BorrowedChordSpec[] = [
  // Zoom 2: the common, frequently-used borrows.
  { degree: { degree: 4, alteration: 0 }, quality: "minor", explanationKey: "iv", depth: 2, strength: 0.7 },
  { degree: { degree: 6, alteration: -1 }, quality: "major", explanationKey: "bVI", depth: 2, strength: 0.65 },
  { degree: { degree: 7, alteration: -1 }, quality: "major", explanationKey: "bVII", depth: 2, strength: 0.65 },
  // Zoom 3: broader modal interchange.
  { degree: { degree: 3, alteration: -1 }, quality: "major", explanationKey: "bIII", depth: 3, strength: 0.45 },
  { degree: { degree: 2, alteration: -1 }, quality: "major", explanationKey: "bII", depth: 3, strength: 0.4 },
  { degree: { degree: 2, alteration: 0 }, quality: "diminished", explanationKey: "iiDim", depth: 3, strength: 0.35 },
];

/**
 * Chords borrowed from the parallel major into a minor key. Scoped to the
 * single most common case for v1 — the "Picardy third" major tonic — rather
 * than mirroring the full major-borrows-from-minor palette; minor-into-major
 * borrowing is the overwhelmingly more common direction in practice. See
 * docs/music-engine.md.
 */
const MINOR_BORROWS_FROM_MAJOR: BorrowedChordSpec[] = [
  { degree: { degree: 1, alteration: 0 }, quality: "major", explanationKey: "picardy", depth: 2, strength: 0.55 },
];

function explanation(explanationKey: string): Explanation {
  return { key: `harmony.relationship.borrowed.${explanationKey}` };
}

function specsFor(context: Key): BorrowedChordSpec[] {
  return context.mode === "major" ? MAJOR_BORROWS_FROM_MINOR : MINOR_BORROWS_FROM_MAJOR;
}

/**
 * The canonical borrowed-chord targets for a context, independent of source —
 * shared with ../chromaticMediant and ../commonTone so they can exclude
 * chords this family already claims, rather than emitting a confusing second
 * (differently-labeled) edge to the same target.
 */
export function borrowedChords(context: Key): Chord[] {
  return specsFor(context).map((spec) =>
    buildChord(noteAtScaleDegree(context.tonic, spec.degree), spec.quality),
  );
}

/**
 * Zoom 2 (common) and Zoom 3 (broader) modal interchange, anchored at the
 * tonic chord: e.g. in C major, C -> Fm (iv), Ab (bVI), Bb (bVII) at Zoom 2,
 * and C -> Eb (bIII), Db (bII, Neapolitan), Ddim (borrowed ii°) at Zoom 3.
 */
export function borrowedRelationships(source: Chord, context: Key): HarmonicEdge[] {
  if (!isTonic(source, context)) return [];

  return specsFor(context).map((spec) => ({
    source,
    target: buildChord(noteAtScaleDegree(context.tonic, spec.degree), spec.quality),
    relationshipType: "borrowed",
    harmonicDepth: spec.depth,
    strength: spec.strength,
    explanation: explanation(spec.explanationKey),
    context,
  }));
}
