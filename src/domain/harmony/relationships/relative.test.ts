import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { relativeRelationships } from "./relative";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("relativeRelationships", () => {
  it("C major's tonic -> Am (relative minor)", () => {
    const edges = relativeRelationships(parseChordSymbol("C"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Am");
    expect(edges[0].harmonicDepth).toBe(1);
  });

  it("A minor's tonic -> C (relative major)", () => {
    const edges = relativeRelationships(parseChordSymbol("Am"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("C");
  });

  it("negative: only anchored at the tonic, not at other diatonic chords", () => {
    expect(relativeRelationships(parseChordSymbol("G"), cMajor)).toEqual([]);
    expect(relativeRelationships(parseChordSymbol("Am"), cMajor)).toEqual([]);
  });
});
