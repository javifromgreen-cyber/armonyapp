import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import {
  dominantOf,
  recognizedDominantSeventhChords,
  secondaryDominantRelationships,
  secondaryDominantChainRelationships,
} from "./secondaryDominant";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("dominantOf", () => {
  it("the dominant 7th a fifth above a root", () => {
    expect(chordSymbol(dominantOf(parseNoteName("D")))).toBe("A7");
  });
});

describe("secondaryDominantRelationships — C major", () => {
  it("from the tonic: A7 (V7/ii) B7 (V7/iii) C7 (V7/IV) D7 (V7/V) E7 (V7/vi)", () => {
    const targets = secondaryDominantRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["A7", "B7", "C7", "D7", "E7"].sort());
  });

  it("A7 resolves back to Dm (ii)", () => {
    const edges = secondaryDominantRelationships(parseChordSymbol("A7"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Dm");
    expect(edges[0].relationshipType).toBe("secondaryDominant");
  });

  it("negative: a chord with no secondary-dominant role produces no edges", () => {
    expect(secondaryDominantRelationships(parseChordSymbol("F#7"), cMajor)).toEqual([]);
  });
});

describe("secondaryDominantRelationships — A minor: the bVII7/V7-of-III coincidence", () => {
  it("excludes V7/III (G7) because it's identical to the diatonic bVII7", () => {
    const targets = secondaryDominantRelationships(parseChordSymbol("Am"), aMinor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).not.toContain("G7");
    expect(targets.sort()).toEqual(["A7", "B7", "C7", "F#7"].sort());
  });

  it("recognizedDominantSeventhChords also excludes the coincidental G7", () => {
    const symbols = recognizedDominantSeventhChords(aMinor).map(chordSymbol);
    expect(symbols).not.toContain("G7");
    expect(symbols.sort()).toEqual(["A7", "B7", "C7", "E7", "F#7"].sort());
  });
});

describe("recognizedDominantSeventhChords — C major", () => {
  it("the primary V7 plus the 5 secondary dominants", () => {
    const symbols = recognizedDominantSeventhChords(cMajor).map(chordSymbol);
    expect(symbols.sort()).toEqual(["A7", "B7", "C7", "D7", "E7", "G7"].sort());
  });
});

describe("secondaryDominantChainRelationships — the V7/V/V double dominant", () => {
  it("D7 (V7/V) -> A7 (V7/V/V) in C major", () => {
    const edges = secondaryDominantChainRelationships(parseChordSymbol("D7"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("A7");
    expect(edges[0].harmonicDepth).toBe(3);
  });

  it("G7 (the primary V, not V/V) does not chain further", () => {
    expect(secondaryDominantChainRelationships(parseChordSymbol("G7"), cMajor)).toEqual([]);
  });
});
