import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { passingDiminishedRelationships } from "./passingDiminished";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("passingDiminishedRelationships — C major", () => {
  it("C -> C#dim7 (passing between I and ii; the 7-to-1 wrap is a half step, so no wrap edge)", () => {
    const targets = passingDiminishedRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["C#dim7"]);
  });

  it("Dm also reaches C#dim7 (the other side of the same passing chord)", () => {
    const targets = passingDiminishedRelationships(parseChordSymbol("Dm"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toContain("C#dim7");
  });

  it("C#dim7 resolves to both C and Dm", () => {
    const targets = passingDiminishedRelationships(parseChordSymbol("C#dim7"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["C", "Dm"].sort());
  });

  it("Em reaches D#dim7 (its whole-tone neighbor Dm) but not via F (E-F is a half step)", () => {
    const targets = passingDiminishedRelationships(parseChordSymbol("Em"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["D#dim7"]);
  });
});

describe("passingDiminishedRelationships — A minor: the wrap IS a whole tone", () => {
  it("Am reaches A#dim7 (i to ii) AND G#dim7 is suppressed (it's leadingToneDiminished instead)", () => {
    const targets = passingDiminishedRelationships(parseChordSymbol("Am"), aMinor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["A#dim7"]);
    expect(targets).not.toContain("G#dim7");
  });
});
