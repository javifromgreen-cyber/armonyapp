import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { relationshipsBetween } from "../graph/harmonicGraph";
import { harmonicCharacterFor } from "./harmonicCharacter";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

function edgeBetween(from: string, to: string, maxDepth: 1 | 2 | 3 | 4 = 4) {
  const edges = relationshipsBetween(parseChordSymbol(from), parseChordSymbol(to), cMajor, maxDepth);
  expect(edges.length).toBeGreaterThan(0);
  return edges[0];
}

describe("harmonicCharacterFor — baseline relationship-type mapping", () => {
  it("diatonic (non-deceptive) reads as a natural continuation", () => {
    // C -> F: diatonic, F is predominant-function, not the deceptive submediant case.
    expect(harmonicCharacterFor(edgeBetween("C", "F"))).toBe("naturalContinuation");
  });

  it("relative reads as a natural continuation", () => {
    const edges = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("Am"), cMajor, 1);
    const relative = edges.find((e) => e.relationshipType === "relative")!;
    expect(harmonicCharacterFor(relative)).toBe("naturalContinuation");
  });

  it("functionalDominant reads as strong resolution (A minor's harmonic-minor-derived E7 -> Am)", () => {
    const edges = relationshipsBetween(parseChordSymbol("E7"), parseChordSymbol("Am"), aMinor, 1);
    const functionalDominant = edges.find((e) => e.relationshipType === "functionalDominant")!;
    expect(functionalDominant).toBeDefined();
    expect(harmonicCharacterFor(functionalDominant)).toBe("strongResolution");
  });

  it("secondaryDominant reads as tension", () => {
    expect(harmonicCharacterFor(edgeBetween("C", "A7"))).toBe("tension");
  });

  it("borrowed reads as modal colour", () => {
    expect(harmonicCharacterFor(edgeBetween("C", "Bb"))).toBe("modalColour");
  });

  it("substitution reads as substitution", () => {
    const edges = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("Am"), cMajor, 2);
    const substitution = edges.find((e) => e.relationshipType === "substitution")!;
    expect(harmonicCharacterFor(substitution)).toBe("substitution");
  });

  it("tritoneSubstitution reads as substitution", () => {
    expect(harmonicCharacterFor(edgeBetween("G7", "Db7"))).toBe("substitution");
  });

  it("chromaticMediant reads as chromatic colour", () => {
    expect(harmonicCharacterFor(edgeBetween("C", "E"))).toBe("chromaticColour");
  });

  it("commonTone reads as adventurous", () => {
    expect(harmonicCharacterFor(edgeBetween("Dm", "D"))).toBe("adventurous");
  });

  it("distantKey reads as adventurous", () => {
    const edges = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("F#"), cMajor, 4).filter(
      (e) => e.relationshipType === "distantKey",
    );
    expect(edges.length).toBeGreaterThan(0);
    expect(harmonicCharacterFor(edges[0])).toBe("adventurous");
  });
});

describe("harmonicCharacterFor — deceptive resolution override (V -> vi)", () => {
  it("G -> Am (plain diatonic, dominant function to the submediant) reads as deceptive", () => {
    const edges = relationshipsBetween(parseChordSymbol("G"), parseChordSymbol("Am"), cMajor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(harmonicCharacterFor(diatonic)).toBe("deceptive");
  });

  it("G -> C (the actual tonic, same dominant source) is strongResolution, not deceptive", () => {
    const edges = relationshipsBetween(parseChordSymbol("G"), parseChordSymbol("C"), cMajor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(harmonicCharacterFor(diatonic)).toBe("strongResolution");
  });

  it("Dm -> Am (predominant source, not dominant) is never deceptive even though Am is the submediant", () => {
    const edges = relationshipsBetween(parseChordSymbol("Dm"), parseChordSymbol("Am"), cMajor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(harmonicCharacterFor(diatonic)).not.toBe("deceptive");
  });

  it("the strongResolution/deceptive overrides are major-mode only — natural minor's weak bVII-i is neither", () => {
    // `classifyFunction` classifies natural minor's degree-5/7 chords (v,
    // bVII) as "dominant" too (a documented simplification in
    // harmonicFunction.ts), but they lack a leading tone and aren't a real
    // authentic-cadence-style pull the way major's V/vii° are — e.g. G (the
    // natural subtonic) -> Am in A minor is a common but harmonically mild
    // motion, not the "strong resolution" label. The engine's genuinely
    // strong minor dominant (E7, the harmonic-minor-derived V7) is tagged
    // `functionalDominant` instead and is unaffected by this scoping.
    const edges = relationshipsBetween(parseChordSymbol("G"), parseChordSymbol("Am"), aMinor, 1);
    const diatonic = edges.find((e) => e.relationshipType === "diatonic")!;
    expect(diatonic).toBeDefined();
    expect(harmonicCharacterFor(diatonic)).not.toBe("strongResolution");
    expect(harmonicCharacterFor(diatonic)).not.toBe("deceptive");
    expect(harmonicCharacterFor(diatonic)).toBe("naturalContinuation");
  });
});
