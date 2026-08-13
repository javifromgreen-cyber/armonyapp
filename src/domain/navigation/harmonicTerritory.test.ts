import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { relationshipsBetween } from "../graph/harmonicGraph";
import { harmonicTerritoryFor } from "./harmonicTerritory";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

function edgeOfType(from: string, to: string, context: Key, relationshipType: string, maxDepth: 1 | 2 | 3 | 4 = 4) {
  const edges = relationshipsBetween(parseChordSymbol(from), parseChordSymbol(to), context, maxDepth);
  const edge = edges.find((e) => e.relationshipType === relationshipType);
  expect(edge).toBeDefined();
  return edge!;
}

describe("harmonicTerritoryFor — Phase R3.2 §52 representative cases (actual supported relationship types only)", () => {
  it("diatonic/common (C -> F) -> natural", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "F", cMajor, "diatonic", 1))).toBe("natural");
  });

  it("relative (C -> Am) -> natural", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "Am", cMajor, "relative", 1))).toBe("natural");
  });

  it("secondary dominant (C -> A7) -> tension", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "A7", cMajor, "secondaryDominant"))).toBe("tension");
  });

  it("functionalDominant / authentic-cadence diatonic (G -> C) -> tension", () => {
    // Major-mode V-I: harmonicCharacterFor's own override already classifies
    // this as strongResolution; territory must inherit that, not re-derive.
    const edges = relationshipsBetween(parseChordSymbol("G"), parseChordSymbol("C"), cMajor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(harmonicTerritoryFor(diatonic)).toBe("tension");
  });

  it("minor-key harmonic-minor functional dominant (E7 -> Am in A minor) -> tension", () => {
    expect(harmonicTerritoryFor(edgeOfType("E7", "Am", aMinor, "functionalDominant", 1))).toBe("tension");
  });

  it("deceptive resolution (G -> Am, major mode) -> tension", () => {
    const edges = relationshipsBetween(parseChordSymbol("G"), parseChordSymbol("Am"), cMajor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(harmonicTerritoryFor(diatonic)).toBe("tension");
  });

  it("modal borrowing (C -> Bb) -> modalColour", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "Bb", cMajor, "borrowed"))).toBe("modalColour");
  });

  it("actual substitution relationship (C -> Am, substitution) -> substitution", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "Am", cMajor, "substitution", 2))).toBe("substitution");
  });

  it("tritone substitution (G7 -> Db7) -> substitution", () => {
    expect(harmonicTerritoryFor(edgeOfType("G7", "Db7", cMajor, "tritoneSubstitution"))).toBe("substitution");
  });

  it("remote/chromatic relationship (chromatic mediant, C -> E) -> exploration", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "E", cMajor, "chromaticMediant"))).toBe("exploration");
  });

  it("common-tone (Dm -> D) -> exploration", () => {
    expect(harmonicTerritoryFor(edgeOfType("Dm", "D", cMajor, "commonTone"))).toBe("exploration");
  });

  it("distant key (C -> F#) -> exploration", () => {
    expect(harmonicTerritoryFor(edgeOfType("C", "F#", cMajor, "distantKey"))).toBe("exploration");
  });
});

describe("harmonicTerritoryFor — territory is independent of depth (Phase R3.2 §22)", () => {
  it("a Depth-1 relationship and a Depth-2 relationship can share the same territory (both natural)", () => {
    const depth1 = edgeOfType("C", "F", cMajor, "diatonic", 1); // Zoom 1
    const depth2 = edgeOfType("C", "Dm7", cMajor, "diatonicSeventh", 2); // Zoom 2
    expect(depth1.harmonicDepth).toBe(1);
    expect(depth2.harmonicDepth).toBe(2);
    expect(harmonicTerritoryFor(depth1)).toBe("natural");
    expect(harmonicTerritoryFor(depth2)).toBe("natural");
  });

  it("territory classification never reads harmonicDepth directly — same character always yields the same territory regardless of depth", () => {
    // secondaryDominant is always Zoom 2, secondaryDominantChain is Zoom 3 —
    // both carry the "tension" character and must land in the same
    // territory. D7 (V7/V) -> A7 (V7/V/V) is a guaranteed, deterministic
    // chain (see secondaryDominant.test.ts), unlike C -> F which has no
    // reason to chain and would silently produce no edge to assert on.
    const secDom = edgeOfType("C", "A7", cMajor, "secondaryDominant");
    const chained = edgeOfType("D7", "A7", cMajor, "secondaryDominantChain", 3);
    expect(chained.harmonicDepth).toBe(3);
    expect(harmonicTerritoryFor(secDom)).toBe(harmonicTerritoryFor(chained));
  });
});
