import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import {
  dominantOf,
  isRecognizedDominant,
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

  // Explicit degree + resolution-target pinning for every secondary dominant in C major.
  // A prior status report mislabeled A7 as "V7/vi" in prose (it's V7/ii); the code and
  // tests were already correct, but these cases lock down both the applied degree
  // (explanation.params.targetDegree) and the actual resolution target so that kind of
  // mistake can't silently ship in the metadata either.
  const secondaryDominantCases: Array<{
    dominant: string;
    romanNumeral: string;
    targetDegree: number;
    resolvesTo: string;
  }> = [
    { dominant: "A7", romanNumeral: "V7/ii", targetDegree: 2, resolvesTo: "Dm" },
    { dominant: "B7", romanNumeral: "V7/iii", targetDegree: 3, resolvesTo: "Em" },
    { dominant: "C7", romanNumeral: "V7/IV", targetDegree: 4, resolvesTo: "F" },
    { dominant: "D7", romanNumeral: "V7/V", targetDegree: 5, resolvesTo: "G" },
    { dominant: "E7", romanNumeral: "V7/vi", targetDegree: 6, resolvesTo: "Am" },
  ];

  for (const { dominant, romanNumeral, targetDegree, resolvesTo } of secondaryDominantCases) {
    it(`${dominant} is ${romanNumeral}: targetDegree ${targetDegree}, resolves to ${resolvesTo}`, () => {
      // From the tonic: the edge to `dominant` carries the correct targetDegree.
      const fromTonic = secondaryDominantRelationships(parseChordSymbol("C"), cMajor).find(
        (e) => chordSymbol(e.target) === dominant,
      );
      expect(fromTonic).toBeDefined();
      expect(fromTonic?.explanation.params?.targetDegree).toBe(targetDegree);

      // From the dominant itself: it resolves to the correct chord, same targetDegree.
      const resolution = secondaryDominantRelationships(parseChordSymbol(dominant), cMajor);
      expect(resolution).toHaveLength(1);
      expect(chordSymbol(resolution[0].target)).toBe(resolvesTo);
      expect(resolution[0].explanation.params?.targetDegree).toBe(targetDegree);
    });
  }
});

describe("secondaryDominantRelationships — C7's root coincides with the tonic (regression)", () => {
  // C7's root is C, the same as the tonic — but C7 is NOT the tonic, it's
  // V7/IV. Before this fix, C7 was misread as "querying from the tonic" and
  // returned all 5 secondary dominants (including a nonsensical self-loop to
  // C7 itself) instead of resolving to F.
  it("C7 resolves to exactly F, never a 5-way fan-out or a self-loop", () => {
    const edges = secondaryDominantRelationships(parseChordSymbol("C7"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("F");
    expect(edges.some((e) => chordSymbol(e.target) === "C7")).toBe(false);
  });

  it("A7 in A minor (root coincides with the A-minor tonic) resolves to Dm, not a fan-out", () => {
    const edges = secondaryDominantRelationships(parseChordSymbol("A7"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Dm");
  });
});

describe("isRecognizedDominant", () => {
  it("true for the primary and every secondary dominant", () => {
    for (const symbol of ["G7", "A7", "B7", "C7", "D7", "E7"]) {
      expect(isRecognizedDominant(parseChordSymbol(symbol), cMajor)).toBe(true);
    }
  });

  it("false for the tonic, a diatonic triad, or an unrelated dominant7", () => {
    expect(isRecognizedDominant(parseChordSymbol("C"), cMajor)).toBe(false);
    expect(isRecognizedDominant(parseChordSymbol("Dm"), cMajor)).toBe(false);
    expect(isRecognizedDominant(parseChordSymbol("F#7"), cMajor)).toBe(false);
  });

  it("A minor: true for the functional dominant E7, false for the excluded coincidental G7", () => {
    expect(isRecognizedDominant(parseChordSymbol("E7"), aMinor)).toBe(true);
    expect(isRecognizedDominant(parseChordSymbol("G7"), aMinor)).toBe(false);
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
