import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { getChordDisplayInfo } from "./chordDisplayInfo";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("getChordDisplayInfo", () => {
  it("Am7 shows its notes and interval formula from the product-spec worked example", () => {
    const info = getChordDisplayInfo(parseChordSymbol("Am7"), parseChordSymbol("Am7"), cMajor);
    expect(info.symbol).toBe("Am7");
    expect(info.noteNames).toEqual(["A", "C", "E", "G"]);
    expect(info.intervalFormula).toEqual(["1", "b3", "5", "b7"]);
  });

  it("contextual role is surfaced correctly, not just the root-based family", () => {
    // C7 in C major is V7/IV, not tonic — this is the exact bug fixed in the
    // Phase 3 correctness pass; the panel must show the refined role.
    const c7Info = getChordDisplayInfo(parseChordSymbol("C7"), parseChordSymbol("C"), cMajor);
    expect(c7Info.contextualRole).toEqual({ kind: "secondaryDominant", targetDegree: 4 });

    const cInfo = getChordDisplayInfo(parseChordSymbol("C"), parseChordSymbol("C"), cMajor);
    expect(cInfo.contextualRole).toEqual({ kind: "tonic" });
  });

  it("arrivalRelationships is empty when there is no previous chord (the very first chord)", () => {
    const info = getChordDisplayInfo(parseChordSymbol("C"), undefined, cMajor);
    expect(info.arrivalRelationships).toEqual([]);
  });

  it("arrivalRelationships is empty when the previous chord IS this chord (defensive — shouldn't happen via normal navigation)", () => {
    const info = getChordDisplayInfo(parseChordSymbol("C"), parseChordSymbol("C"), cMajor);
    expect(info.arrivalRelationships).toEqual([]);
  });

  it("arrivalRelationships lists every relationship connecting the previous chord to this one, at any depth", () => {
    // C -> Am is diatonic + relative + substitution simultaneously, but
    // substitution is a Zoom 2 relationship — Phase R3 always shows all four
    // depths at once (no manual Zoom selector), so all three show here too.
    const info = getChordDisplayInfo(parseChordSymbol("Am"), parseChordSymbol("C"), cMajor);
    const types = info.arrivalRelationships.map((r) => r.relationshipType).sort();
    expect(types).toEqual(["diatonic", "relative", "substitution"].sort());
  });

  it("works the same for a minor-key functional dominant (E7 in A minor)", () => {
    const info = getChordDisplayInfo(parseChordSymbol("E7"), parseChordSymbol("Am"), aMinor);
    expect(info.contextualRole).toEqual({ kind: "functionalDominant" });
    expect(info.arrivalRelationships.map((r) => r.relationshipType)).toContain("functionalDominant");
  });

  it("includes even the deepest (Zoom 4) relationships, since Phase R3 has no depth cap", () => {
    // Dm -> D is a Zoom 4 commonTone relationship — verifies the panel
    // reaches all the way to Zoom 4 without a caller-supplied depth.
    const info = getChordDisplayInfo(parseChordSymbol("D"), parseChordSymbol("Dm"), cMajor);
    expect(info.arrivalRelationships.map((r) => r.relationshipType)).toContain("commonTone");
  });
});
