import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { localChordToneMap } from "./fretboardMap";

describe("localChordToneMap", () => {
  it("only returns fret locations that land on a real chord tone", () => {
    const chord = parseChordSymbol("Cmaj7"); // C E G B
    const map = localChordToneMap(chord, 0, 5);
    const expectedTokens = new Set(["1", "3", "5", "7"]);
    for (const entry of map) {
      expect(expectedTokens.has(entry.token)).toBe(true);
    }
  });

  it("marks exactly the root's pitch class as isRoot, on every string", () => {
    const chord = parseChordSymbol("C"); // root pitch class 0
    const map = localChordToneMap(chord, 0, 8);
    for (const entry of map) {
      expect(entry.isRoot).toBe(entry.pitchClass === 0);
    }
    expect(map.some((e) => e.isRoot)).toBe(true);
  });

  it("covers all 4 strings", () => {
    const chord = parseChordSymbol("G7");
    const map = localChordToneMap(chord, 0, 5);
    const strings = new Set(map.map((e) => e.string));
    expect(strings.size).toBe(4);
  });

  it("respects the given fret window", () => {
    const chord = parseChordSymbol("C");
    const map = localChordToneMap(chord, 2, 4);
    for (const entry of map) {
      expect(entry.fret).toBeGreaterThanOrEqual(2);
      expect(entry.fret).toBeLessThanOrEqual(4);
    }
  });
});
