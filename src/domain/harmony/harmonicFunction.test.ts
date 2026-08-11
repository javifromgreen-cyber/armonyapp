import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { classifyFunction, diatonicDegreeOf, isDiatonicRoot } from "./harmonicFunction";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("classifyFunction — C major", () => {
  const expected: Record<string, "tonic" | "predominant" | "dominant"> = {
    C: "tonic",
    Dm: "predominant",
    Em: "tonic",
    F: "predominant",
    G: "dominant",
    Am: "tonic",
    Bdim: "dominant",
  };

  for (const [symbol, fn] of Object.entries(expected)) {
    it(`${symbol} is ${fn}`, () => {
      expect(classifyFunction(parseChordSymbol(symbol), cMajor)).toBe(fn);
    });
  }

  it("is quality-agnostic: Cmaj7, C6, and C are all tonic", () => {
    expect(classifyFunction(parseChordSymbol("Cmaj7"), cMajor)).toBe("tonic");
    expect(classifyFunction(parseChordSymbol("C6"), cMajor)).toBe("tonic");
  });

  it("returns undefined for a chord whose ROOT isn't diatonic (quality-agnostic: Cm's root C still classifies)", () => {
    expect(classifyFunction(parseChordSymbol("Ab"), cMajor)).toBeUndefined();
    expect(classifyFunction(parseChordSymbol("Cm"), cMajor)).toBe("tonic");
  });
});

describe("classifyFunction — A natural minor", () => {
  it("classifies the natural (weak) v as dominant-position, same as major's V", () => {
    expect(classifyFunction(parseChordSymbol("Em"), aMinor)).toBe("dominant");
  });

  it("classifies i, III, VI as tonic", () => {
    expect(classifyFunction(parseChordSymbol("Am"), aMinor)).toBe("tonic");
    expect(classifyFunction(parseChordSymbol("C"), aMinor)).toBe("tonic");
    expect(classifyFunction(parseChordSymbol("F"), aMinor)).toBe("tonic");
  });
});

describe("diatonicDegreeOf / isDiatonicRoot", () => {
  it("finds the 1-7 degree for a diatonic root", () => {
    expect(diatonicDegreeOf(parseChordSymbol("G"), cMajor)).toBe(5);
    expect(diatonicDegreeOf(parseChordSymbol("G7"), cMajor)).toBe(5);
  });

  it("returns undefined for a non-diatonic root", () => {
    expect(diatonicDegreeOf(parseChordSymbol("Ab"), cMajor)).toBeUndefined();
  });

  it("isDiatonicRoot mirrors the same membership test on a raw pitch class", () => {
    expect(isDiatonicRoot(7, cMajor)).toBe(true); // G
    expect(isDiatonicRoot(8, cMajor)).toBe(false); // Ab
  });
});
