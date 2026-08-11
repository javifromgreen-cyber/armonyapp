import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { tritoneSubstitutionRelationships } from "./tritoneSubstitution";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("tritoneSubstitutionRelationships", () => {
  it("the primary V7 substitutes as the conventional bII7 of the tonic: G7 -> Db7", () => {
    const edges = tritoneSubstitutionRelationships(parseChordSymbol("G7"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Db7");
    expect(edges[0].harmonicDepth).toBe(3);
  });

  it("a secondary dominant substitutes as bII7 of what IT resolves to: A7 (V7/ii) -> Eb7", () => {
    const edges = tritoneSubstitutionRelationships(parseChordSymbol("A7"), cMajor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Eb7");
  });

  it("A minor's functional dominant substitutes as bII7 of the tonic: E7 -> Bb7", () => {
    const edges = tritoneSubstitutionRelationships(parseChordSymbol("E7"), aMinor);
    expect(edges).toHaveLength(1);
    expect(chordSymbol(edges[0].target)).toBe("Bb7");
  });

  it("negative: a dominant7 chord that isn't a recognized dominant in this key has no substitution", () => {
    // F#7 is not V7 of anything diatonic in C major.
    expect(tritoneSubstitutionRelationships(parseChordSymbol("F#7"), cMajor)).toEqual([]);
  });

  it("negative: a non-dominant7 chord never substitutes, even if it's the tonic", () => {
    expect(tritoneSubstitutionRelationships(parseChordSymbol("C"), cMajor)).toEqual([]);
    expect(tritoneSubstitutionRelationships(parseChordSymbol("Cmaj7"), cMajor)).toEqual([]);
  });
});
