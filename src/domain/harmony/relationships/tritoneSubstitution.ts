import type { Key } from "../../keys/key";
import { noteAtScaleDegree } from "../../intervals/scaleDegree";
import { buildChord, type Chord } from "../../chords/chord";
import { chordsEqual } from "../chordIdentity";
import { recognizedDominants } from "./secondaryDominant";
import type { HarmonicEdge } from "../types";

/**
 * Zoom 3: tritone substitution — a dominant-7th chord's root a tritone away,
 * sharing the same 3rd/7th tritone (e.g. G7 <-> Db7, both containing B/Cb and
 * F). Only applies to dominant-7th chords that are actually a recognized
 * dominant in this context (../secondaryDominant's primary + secondary set) —
 * substituting a dominant7-quality chord that isn't functioning as a dominant
 * here wouldn't be a meaningful "substitution" of anything.
 *
 * The substitute is spelled as the conventional bII7 *of the chord being
 * resolved to* (e.g. G7 resolves to C, so the substitute is Db7, "bII7 of
 * C") rather than a generic +6-semitone transposition of the source — the
 * generic transpose table spells an ascending tritone as an augmented 4th
 * (G7 -> C#7), which is technically a valid tritone but not the spelling any
 * real chart uses for this specific, well-known relationship.
 */
export function tritoneSubstitutionRelationships(
  source: Chord,
  context: Key,
): HarmonicEdge[] {
  if (source.qualityId !== "dominant7") return [];

  const recognized = recognizedDominants(context).find((entry) =>
    chordsEqual(entry.chord, source),
  );
  if (!recognized) return [];

  const substituteRoot = noteAtScaleDegree(recognized.resolvesTo.root, {
    degree: 2,
    alteration: -1,
  });
  const target = buildChord(substituteRoot, "dominant7");

  return [
    {
      source,
      target,
      relationshipType: "tritoneSubstitution",
      harmonicDepth: 3,
      strength: 0.5,
      explanation: { key: "harmony.relationship.tritoneSubstitution" },
      context,
    },
  ];
}
