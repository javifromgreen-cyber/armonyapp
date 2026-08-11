import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { diatonicSeventhChords, diatonicSeventhRelationships } from "./diatonicSeventh";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("diatonicSeventhChords", () => {
  it("C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5", () => {
    expect(diatonicSeventhChords(cMajor).map(chordSymbol)).toEqual([
      "Cmaj7",
      "Dm7",
      "Em7",
      "Fmaj7",
      "G7",
      "Am7",
      "Bm7b5",
    ]);
  });

  it("A natural minor: Am7 Bm7b5 Cmaj7 Dm7 Em7 Fmaj7 G7 (note bVII7 is a dominant 7th)", () => {
    expect(diatonicSeventhChords(aMinor).map(chordSymbol)).toEqual([
      "Am7",
      "Bm7b5",
      "Cmaj7",
      "Dm7",
      "Em7",
      "Fmaj7",
      "G7",
    ]);
  });
});

describe("diatonicSeventhRelationships", () => {
  it("Zoom 2, excludes an exact quality match with the source", () => {
    const edges = diatonicSeventhRelationships(parseChordSymbol("Cmaj7"), cMajor);
    expect(edges.map((e) => chordSymbol(e.target))).not.toContain("Cmaj7");
    expect(edges).toHaveLength(6);
    for (const edge of edges) expect(edge.harmonicDepth).toBe(2);
  });

  it("does not exclude the plain triad of the same root (different quality)", () => {
    const edges = diatonicSeventhRelationships(parseChordSymbol("C"), cMajor);
    expect(edges.map((e) => chordSymbol(e.target))).toContain("Cmaj7");
    expect(edges).toHaveLength(7);
  });
});
