import type { Key } from "../../keys/key";
import { diatonicChords } from "../../keys/key";
import { mod12 } from "../../notes/pitchClass";
import { noteToPitchClass, spellPitchClass } from "../../notes/note";
import { buildChord, type Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { functionalLeadingToneDiminished } from "../functionalMinor";
import type { HarmonicEdge } from "../types";

const WHOLE_TONE = 2;

/**
 * Zoom 3: passing diminished chords — a diminished 7th built a chromatic
 * half-step above the lower chord of any two diatonic scale-degree neighbors
 * that are a whole tone apart (e.g. C -> Dm in C major get C#dim7 between
 * them). Scans the key's own diatonic scale degrees cyclically (including the
 * 7-to-1 wrap, which is a whole tone in natural minor but a half step in
 * major, so it only produces an edge there for minor) rather than hardcoding
 * which degree pairs qualify. The passing chord is spelled as the lower
 * chord's root sharped (e.g. C#, not Db) — the conventional notation for an
 * ascending chromatic passing tone, distinct from ../../intervals/transpose's
 * generic (direction-based but quality-agnostic) spelling table.
 *
 * Excludes the one case that always coincides with a more specific,
 * zoom-1 relationship: in natural minor, the passing chord between bVII and i
 * (e.g. G#dim7 between G and Am) is *always* the same chord as
 * ../functionalDominant's leading-tone diminished 7th — both are "a
 * diminished 7th on the raised leading tone" by construction, so it keeps its
 * more specific label instead of a redundant second edge.
 */
export function passingDiminishedRelationships(
  source: Chord,
  context: Key,
): HarmonicEdge[] {
  const diatonic = diatonicChords(context);
  const leadingToneDiminished =
    context.mode === "natural-minor"
      ? functionalLeadingToneDiminished(context, "diminished7")
      : undefined;
  const edges: HarmonicEdge[] = [];

  for (let i = 0; i < diatonic.length; i++) {
    const lower = diatonic[i];
    const upper = diatonic[(i + 1) % diatonic.length];
    const interval = mod12(
      noteToPitchClass(upper.chord.root) - noteToPitchClass(lower.chord.root),
    );
    if (interval !== WHOLE_TONE) continue;

    const passingRoot = spellPitchClass(
      mod12(noteToPitchClass(lower.chord.root) + 1),
      lower.chord.root.letter,
    );
    const passingChord = buildChord(passingRoot, "diminished7");
    if (leadingToneDiminished && chordsEqual(passingChord, leadingToneDiminished)) continue;

    if (chordsEqual(source, lower.chord) || chordsEqual(source, upper.chord)) {
      edges.push({
        source,
        target: passingChord,
        relationshipType: "passingDiminished",
        harmonicDepth: 3,
        strength: 0.35,
        explanation: { key: "harmony.relationship.passingDiminished" },
        context,
      });
    }

    if (chordsEqual(source, passingChord)) {
      for (const neighbor of [lower.chord, upper.chord]) {
        edges.push({
          source,
          target: neighbor,
          relationshipType: "passingDiminished",
          harmonicDepth: 3,
          strength: 0.4,
          explanation: { key: "harmony.relationship.passingDiminishedResolve" },
          context,
        });
      }
    }
  }

  return edges;
}
