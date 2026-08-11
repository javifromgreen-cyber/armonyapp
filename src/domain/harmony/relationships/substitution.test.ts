import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { substitutionRelationships } from "./substitution";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

describe("substitutionRelationships — C major", () => {
  it("C (tonic) <-> Am and Em (the other tonic-function chords, 2 shared tones each)", () => {
    const targets = substitutionRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Am", "Em"].sort());
  });

  it("F (predominant) <-> Dm", () => {
    const targets = substitutionRelationships(parseChordSymbol("F"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["Dm"]);
  });

  it("G (dominant) <-> Bdim", () => {
    const targets = substitutionRelationships(parseChordSymbol("G"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["Bdim"]);
  });

  it("substitution is pairwise, not a 3-way clique: Am only substitutes back to C (Am/Em share just 1 tone)", () => {
    const targets = substitutionRelationships(parseChordSymbol("Am"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["C"]);
  });

  it("negative: a non-diatonic chord has no function, so no substitutions", () => {
    expect(substitutionRelationships(parseChordSymbol("Ab"), cMajor)).toEqual([]);
  });

  it("every edge is Zoom 2", () => {
    for (const edge of substitutionRelationships(parseChordSymbol("C"), cMajor)) {
      expect(edge.harmonicDepth).toBe(2);
    }
  });

  it("negative: C7 is not tonic-function (it's V7/IV), so it gets no substitutes even though its root is C", () => {
    expect(substitutionRelationships(parseChordSymbol("C7"), cMajor)).toEqual([]);
  });

  it("Cmaj7 and C6 are still genuinely tonic-function and get the same substitutes as C", () => {
    expect(
      substitutionRelationships(parseChordSymbol("Cmaj7"), cMajor).map((e) => chordSymbol(e.target)).sort(),
    ).toEqual(["Am", "Em"].sort());
    expect(
      substitutionRelationships(parseChordSymbol("C6"), cMajor).map((e) => chordSymbol(e.target)).sort(),
    ).toEqual(["Am", "Em"].sort());
  });
});
