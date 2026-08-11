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
});
