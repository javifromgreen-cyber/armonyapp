import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { diatonicRelationships } from "./diatonic";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("diatonicRelationships", () => {
  it("C major from C: the other 6 diatonic triads, excluding C itself", () => {
    const targets = diatonicRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Am", "Bdim", "Dm", "Em", "F", "G"].sort());
  });

  it("is anchored at Zoom 1 for every edge", () => {
    for (const edge of diatonicRelationships(parseChordSymbol("C"), cMajor)) {
      expect(edge.harmonicDepth).toBe(1);
      expect(edge.relationshipType).toBe("diatonic");
    }
  });

  it("works the same from a non-tonic diatonic chord (G in C major)", () => {
    const targets = diatonicRelationships(parseChordSymbol("G"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F"].sort());
  });

  it("exclusion is by exact chord identity, not just root: Cmaj7 does not exclude the plain C triad", () => {
    const targets = diatonicRelationships(parseChordSymbol("Cmaj7"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toContain("C");
    expect(targets).toHaveLength(7);
  });

  it("A natural minor from Am: Bdim C Dm Em F G (the natural, not harmonic, minor set)", () => {
    const targets = diatonicRelationships(parseChordSymbol("Am"), aMinor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Bdim", "C", "Dm", "Em", "F", "G"].sort());
  });

  it("from a non-diatonic chord, all 7 diatonic triads are shown (none excluded)", () => {
    const targets = diatonicRelationships(parseChordSymbol("Ab"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toHaveLength(7);
    expect(targets.sort()).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"].sort());
  });
});
