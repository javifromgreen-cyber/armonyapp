import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { distantKeyRelationships } from "./distantKey";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("distantKeyRelationships", () => {
  it("C major -> F# major (a tritone away, same mode)", () => {
    const edges = distantKeyRelationships(parseChordSymbol("C"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("F#");
    expect(edges[0].harmonicDepth).toBe(4);
  });

  it("A minor -> D#m (a tritone away, same mode)", () => {
    const edges = distantKeyRelationships(parseChordSymbol("Am"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("D#m");
  });

  it("anchored only at the tonic", () => {
    expect(distantKeyRelationships(parseChordSymbol("G"), cMajor)).toEqual([]);
  });
});
