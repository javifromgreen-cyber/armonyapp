import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { borrowedChords, borrowedRelationships } from "./borrowed";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("borrowedRelationships — major key borrows from parallel minor", () => {
  it("Zoom 2 (common): Fm (iv), Ab (bVI), Bb (bVII)", () => {
    const edges = borrowedRelationships(parseChordSymbol("C"), cMajor).filter(
      (e) => e.harmonicDepth === 2,
    );
    expect(edges.map((e) => chordSymbol(e.target)).sort()).toEqual(["Ab", "Bb", "Fm"].sort());
  });

  it("Zoom 3 (broader modal interchange): Eb (bIII), Db (bII), Ddim (borrowed ii°)", () => {
    const edges = borrowedRelationships(parseChordSymbol("C"), cMajor).filter(
      (e) => e.harmonicDepth === 3,
    );
    expect(edges.map((e) => chordSymbol(e.target)).sort()).toEqual(["Db", "Ddim", "Eb"].sort());
  });

  it("anchored only at the tonic", () => {
    expect(borrowedRelationships(parseChordSymbol("G"), cMajor)).toEqual([]);
  });

  it("negative: C7's root coincides with the tonic, but C7 is V7/IV, not the tonic", () => {
    expect(borrowedRelationships(parseChordSymbol("C7"), cMajor)).toEqual([]);
  });
});

describe("borrowedRelationships — minor key borrows from parallel major (Picardy)", () => {
  it("A minor's tonic -> A major (the Picardy third)", () => {
    const edges = borrowedRelationships(parseChordSymbol("Am"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("A");
    expect(edges[0].harmonicDepth).toBe(2);
  });

  it("negative: querying FROM the Picardy chord itself produces no self-loop", () => {
    // A major (the Picardy third) has the same root as A minor's tonic, and
    // it's the only entry in the minor-context borrowed set — without a
    // self-target guard this would produce a nonsensical A-major -> A-major edge.
    expect(borrowedRelationships(parseChordSymbol("A"), aMinor)).toEqual([]);
  });

  it("negative: A7's root coincides with the tonic, but A7 is V7/iv, not the tonic", () => {
    expect(borrowedRelationships(parseChordSymbol("A7"), aMinor)).toEqual([]);
  });
});

describe("borrowedChords helper", () => {
  it("matches the union of what borrowedRelationships produces from the tonic", () => {
    const fromRelationships = borrowedRelationships(parseChordSymbol("C"), cMajor)
      .map((e) => chordSymbol(e.target))
      .sort();
    const fromHelper = borrowedChords(cMajor).map(chordSymbol).sort();
    expect(fromHelper).toEqual(fromRelationships);
  });
});
