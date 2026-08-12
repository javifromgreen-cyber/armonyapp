import { describe, expect, it } from "vitest";
import { isNearDuplicate, diversityFilter } from "./diversity";
import type { EvaluatedPattern } from "./playability";
import type { BassPatternStep } from "./types";

function step(string: 1 | 2 | 3 | 4, fret: number): BassPatternStep {
  return {
    string,
    fret,
    pitch: { note: { letter: "C", accidental: 0 }, octave: 2, midi: 36 + fret, frequencyHz: 0 },
    intervalToken: "1",
  };
}

function fixture(steps: BassPatternStep[]): EvaluatedPattern {
  return { steps, fretSpan: 0, baseFret: 0 };
}

describe("isNearDuplicate", () => {
  it("flags two patterns that visit the exact same (string, fret) sequence", () => {
    const a = fixture([step(4, 3), step(3, 5)]);
    const b = fixture([step(4, 3), step(3, 5)]);
    expect(isNearDuplicate(a, b)).toBe(true);
  });

  it("does not flag patterns with a different step count", () => {
    const a = fixture([step(4, 3), step(3, 5)]);
    const b = fixture([step(4, 3), step(3, 5), step(2, 7)]);
    expect(isNearDuplicate(a, b)).toBe(false);
  });

  it("does not flag patterns differing on even one step", () => {
    const a = fixture([step(4, 3), step(3, 5)]);
    const b = fixture([step(4, 3), step(3, 6)]);
    expect(isNearDuplicate(a, b)).toBe(false);
  });

  it("does not flag patterns using different strings for the same frets", () => {
    const a = fixture([step(4, 3), step(3, 5)]);
    const b = fixture([step(3, 3), step(4, 5)]);
    expect(isNearDuplicate(a, b)).toBe(false);
  });
});

describe("diversityFilter", () => {
  it("drops a later candidate that exactly replays an already-kept pattern", () => {
    const kept = fixture([step(4, 3), step(3, 5)]);
    const duplicate = fixture([step(4, 3), step(3, 5)]);
    const distinct = fixture([step(3, 3), step(2, 5)]);
    const result = diversityFilter([duplicate, distinct], (item) => item, [kept]);
    expect(result).toEqual([distinct]);
  });

  it("keeps all candidates when none are near-duplicates", () => {
    const a = fixture([step(4, 3), step(3, 5)]);
    const b = fixture([step(3, 3), step(2, 5)]);
    const result = diversityFilter([a, b], (item) => item);
    expect(result).toEqual([a, b]);
  });
});
