import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { functionalDominantRelationships } from "./functionalDominant";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("functionalDominantRelationships — the E7 -> Am case", () => {
  it("A minor's tonic exposes E7 (functionalDominant) and G#dim7 (leadingToneDiminished)", () => {
    const edges = functionalDominantRelationships(parseChordSymbol("Am"), aMinor);
    const byType = Object.fromEntries(edges.map((e) => [e.relationshipType, chordSymbol(e.target)]));
    expect(byType.functionalDominant).toBe("E7");
    expect(byType.leadingToneDiminished).toBe("G#dim7");
    for (const edge of edges) expect(edge.harmonicDepth).toBe(1);
  });

  it("E7 resolves back to Am", () => {
    const edges = functionalDominantRelationships(parseChordSymbol("E7"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Am");
    expect(edges[0].relationshipType).toBe("functionalDominant");
  });

  it("G#dim7 resolves back to Am", () => {
    const edges = functionalDominantRelationships(parseChordSymbol("G#dim7"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Am");
    expect(edges[0].relationshipType).toBe("leadingToneDiminished");
  });

  it("negative: major-key context never produces this family (the diatonic V7 already covers it)", () => {
    expect(functionalDominantRelationships(parseChordSymbol("C"), cMajor)).toEqual([]);
    expect(functionalDominantRelationships(parseChordSymbol("G7"), cMajor)).toEqual([]);
  });

  it("negative: not anchored at other minor-key diatonic chords", () => {
    expect(functionalDominantRelationships(parseChordSymbol("Dm"), aMinor)).toEqual([]);
  });

  it("negative: A7's root coincides with the tonic, but A7 is V7/iv, not the tonic itself", () => {
    expect(functionalDominantRelationships(parseChordSymbol("A7"), aMinor)).toEqual([]);
  });
});
