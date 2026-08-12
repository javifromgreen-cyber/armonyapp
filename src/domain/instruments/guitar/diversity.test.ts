import { describe, expect, it } from "vitest";
import { isNearDuplicate, diversityFilter } from "./diversity";
import type { EvaluatedVoicing } from "./playability";
import type { GuitarStringSound, StringNumber } from "./types";

/** A minimal EvaluatedVoicing fixture — diversity logic only reads `strings` (state) and `baseFret`. */
function fixture(pattern: (number | "x" | "o")[], baseFret: number): EvaluatedVoicing {
  const strings: GuitarStringSound[] = pattern.map((value, index) => {
    const string = (6 - index) as StringNumber;
    if (value === "x") return { string, state: { status: "muted" } };
    if (value === "o") return { string, state: { status: "open" } };
    return { string, state: { status: "fretted", fret: value } };
  });
  return {
    strings,
    fretSpan: 0,
    baseFret,
    fingerCount: 0,
    openStringCount: 0,
    soundingStringCount: 0,
    mutedInteriorCount: 0,
  };
}

describe("isNearDuplicate", () => {
  it("treats two shapes differing on exactly one string, same inversion/region, as near-duplicates", () => {
    const a = fixture(["o", 3, 2, "o", "o", "o"], 2);
    const b = fixture(["x", 3, 2, "o", "o", "o"], 2);
    expect(isNearDuplicate(a, 0, b, 0)).toBe(true);
  });

  it("does not flag shapes that differ on 2+ strings as near-duplicates", () => {
    const a = fixture(["o", 3, 2, "o", "o", "o"], 2);
    const b = fixture(["x", 3, 2, "o", 1, "o"], 2);
    expect(isNearDuplicate(a, 0, b, 0)).toBe(false);
  });

  it("does not flag shapes with different inversions as near-duplicates, even if frets are close", () => {
    const a = fixture(["x", 3, 2, "o", "o", "o"], 2);
    const b = fixture(["o", 3, 2, "o", "o", "o"], 2);
    expect(isNearDuplicate(a, 0, b, 1)).toBe(false);
  });

  it("does not flag shapes in different neck regions as near-duplicates", () => {
    const a = fixture(["x", 3, 2, "o", "o", "o"], 2);
    const b = fixture(["x", 8, 7, "x", "x", "x"], 7);
    expect(isNearDuplicate(a, 0, b, 0)).toBe(false);
  });

  it("never collapses genuinely different shapes just because they'd sound the same pitch classes", () => {
    // Same notes could be reached via totally different string sets/positions —
    // the heuristic is fret-pattern-based, not pitch-class-based.
    const openPosition = fixture(["x", 3, 2, 0, 1, 0], 1);
    const higherPosition = fixture(["x", "x", 10, 9, 8, "x"], 8);
    expect(isNearDuplicate(openPosition, 0, higherPosition, 0)).toBe(false);
  });
});

describe("diversityFilter", () => {
  it("keeps the best-ranked representative of a near-duplicate cluster and drops the rest", () => {
    const best = fixture(["o", 3, 2, "o", "o", "o"], 2);
    const nearDupe = fixture(["x", 3, 2, "o", "o", "o"], 2);
    const distinct = fixture(["x", 8, 7, "x", "x", "x"], 7);
    const candidates = [best, nearDupe, distinct]; // already sorted best-first
    const kept = diversityFilter(
      candidates,
      (c) => c,
      () => 0,
    );
    expect(kept).toEqual([best, distinct]);
  });

  it("suppresses a generated near-duplicate of an already-kept (e.g. curated) shape", () => {
    const curated = fixture(["x", 3, 2, "o", "o", "o"], 2);
    const generatedNearDupe = fixture(["o", 3, 2, "o", "o", "o"], 2);
    const generatedDistinct = fixture(["x", 8, 7, "x", "x", "x"], 7);
    const kept = diversityFilter(
      [generatedNearDupe, generatedDistinct],
      (c) => c,
      () => 0,
      [curated],
    );
    expect(kept).toEqual([generatedDistinct]);
  });

  it("keeps genuinely diverse candidates in full", () => {
    const a = fixture(["x", 3, 2, 0, 1, 0], 1);
    const b = fixture(["1", "1", "3", "3", "1", "1"].map(Number), 1);
    const c = fixture(["x", "x", 10, 9, 8, "x"], 8);
    const kept = diversityFilter(
      [a, b, c],
      (item) => item,
      () => 0,
    );
    expect(kept).toEqual([a, b, c]);
  });
});
