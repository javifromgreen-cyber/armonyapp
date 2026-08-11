import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../../chords/chord";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { nearbyKeyRelationships } from "./nearbyKey";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("nearbyKeyRelationships — C major from C", () => {
  it("D major, B minor, G minor (Bb major excluded — already borrowed bVII)", () => {
    const targets = nearbyKeyRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Bm", "D", "Gm"].sort());
  });

  it("none of the targets are diatonic to C major", () => {
    const diatonicSymbols = new Set(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    for (const edge of nearbyKeyRelationships(parseChordSymbol("C"), cMajor)) {
      expect(diatonicSymbols.has(chordSymbol(edge.target))).toBe(false);
    }
  });

  it("anchored only at the tonic", () => {
    expect(nearbyKeyRelationships(parseChordSymbol("G"), cMajor)).toEqual([]);
  });
});

describe("nearbyKeyRelationships — A minor from Am", () => {
  it("B minor, G minor, D major, Bb major", () => {
    const targets = nearbyKeyRelationships(parseChordSymbol("Am"), aMinor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["Bb", "Bm", "D", "Gm"].sort());
  });
});
