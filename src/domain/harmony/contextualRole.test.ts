import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { contextualRole, isPlainDiatonicFunction } from "./contextualRole";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("contextualRole — quality and detected relationship override the root-only family", () => {
  it("C, Cmaj7, and C6 in C major are all genuinely tonic (native or harmless-fallback quality)", () => {
    expect(contextualRole(parseChordSymbol("C"), cMajor)).toEqual({ kind: "tonic" });
    expect(contextualRole(parseChordSymbol("Cmaj7"), cMajor)).toEqual({ kind: "tonic" });
    expect(contextualRole(parseChordSymbol("C6"), cMajor)).toEqual({ kind: "tonic" });
  });

  it("C7 in C major is secondaryDominant (V7/IV), NOT tonic, despite sharing the tonic's root", () => {
    expect(contextualRole(parseChordSymbol("C7"), cMajor)).toEqual({
      kind: "secondaryDominant",
      targetDegree: 4,
    });
  });

  it("every secondary dominant in C major carries the correct targetDegree", () => {
    const expected: Record<string, number> = { A7: 2, B7: 3, C7: 4, D7: 5, E7: 6 };
    for (const [symbol, targetDegree] of Object.entries(expected)) {
      expect(contextualRole(parseChordSymbol(symbol), cMajor)).toEqual({
        kind: "secondaryDominant",
        targetDegree,
      });
    }
  });

  it("G7 in C major is plainly dominant — it natively matches the diatonic V7, no override needed", () => {
    expect(contextualRole(parseChordSymbol("G7"), cMajor)).toEqual({ kind: "dominant" });
  });

  it("E7 in A minor is functionalDominant, not a plain root-based 'dominant' guess", () => {
    expect(contextualRole(parseChordSymbol("E7"), aMinor)).toEqual({ kind: "functionalDominant" });
  });

  it("G#dim7 in A minor is leadingToneDiminished", () => {
    expect(contextualRole(parseChordSymbol("G#dim7"), aMinor)).toEqual({
      kind: "leadingToneDiminished",
    });
  });

  it("Em (the natural, weak v) in A minor is still plainly dominant — no functional override applies to it", () => {
    expect(contextualRole(parseChordSymbol("Em"), aMinor)).toEqual({ kind: "dominant" });
  });

  it("Fm (borrowed iv) and Ab (borrowed bVI) in C major are 'borrowed', not 'predominant'/'tonic'", () => {
    expect(contextualRole(parseChordSymbol("Fm"), cMajor)).toEqual({ kind: "borrowed" });
    expect(contextualRole(parseChordSymbol("Ab"), cMajor)).toEqual({ kind: "borrowed" });
  });

  it("Csus4 in C major has no more specific story, so it falls back to the plain root family (tonic)", () => {
    expect(contextualRole(parseChordSymbol("Csus4"), cMajor)).toEqual({ kind: "tonic" });
  });

  it("a totally unrecognized chord (root not even diatonic) has no contextual role at all", () => {
    expect(contextualRole(parseChordSymbol("F#7"), cMajor)).toBeUndefined();
    expect(contextualRole(parseChordSymbol("Ab7"), cMajor)).toBeUndefined();
  });
});

describe("isPlainDiatonicFunction", () => {
  it("true for chords whose role is exactly tonic/predominant/dominant", () => {
    expect(isPlainDiatonicFunction(parseChordSymbol("C"), cMajor)).toBe(true);
    expect(isPlainDiatonicFunction(parseChordSymbol("Dm"), cMajor)).toBe(true);
    expect(isPlainDiatonicFunction(parseChordSymbol("G7"), cMajor)).toBe(true);
  });

  it("false for a secondary dominant, functional dominant, leading-tone diminished, or borrowed chord", () => {
    expect(isPlainDiatonicFunction(parseChordSymbol("C7"), cMajor)).toBe(false);
    expect(isPlainDiatonicFunction(parseChordSymbol("Fm"), cMajor)).toBe(false);
    expect(isPlainDiatonicFunction(parseChordSymbol("E7"), aMinor)).toBe(false);
    expect(isPlainDiatonicFunction(parseChordSymbol("G#dim7"), aMinor)).toBe(false);
  });

  it("false for a chord with no recognized role at all", () => {
    expect(isPlainDiatonicFunction(parseChordSymbol("F#7"), cMajor)).toBe(false);
  });
});
