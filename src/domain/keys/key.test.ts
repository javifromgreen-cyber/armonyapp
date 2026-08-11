import { describe, expect, it } from "vitest";
import { parseNoteName, noteName } from "../notes/note";
import { chordSymbol } from "../chords/chord";
import { keyScaleNotes, diatonicChords, relativeKey, type Key } from "./key";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aNaturalMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("keyScaleNotes", () => {
  it("C major = C D E F G A B", () => {
    expect(keyScaleNotes(cMajor).map(noteName)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("A natural minor = A B C D E F G (same key signature as C major)", () => {
    expect(keyScaleNotes(aNaturalMinor).map(noteName)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
  });
});

describe("diatonicChords — product-spec worked example", () => {
  it("C major: C Dm Em F G Am Bdim", () => {
    const symbols = diatonicChords(cMajor).map((d) => chordSymbol(d.chord));
    expect(symbols).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
  });

  it("classifies each degree's triad quality", () => {
    const qualities = diatonicChords(cMajor).map((d) => d.quality);
    expect(qualities).toEqual([
      "major",
      "minor",
      "minor",
      "major",
      "major",
      "minor",
      "diminished",
    ]);
  });
});

describe("diatonicChords — natural minor (Aeolian) generalizes correctly", () => {
  it("A natural minor: Am Bdim C Dm Em F G (documented in music-engine.md)", () => {
    const symbols = diatonicChords(aNaturalMinor).map((d) => chordSymbol(d.chord));
    expect(symbols).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"]);
  });

  it("the v and vii degrees are minor/major, not the harmonic-minor V/vii°", () => {
    const qualities = diatonicChords(aNaturalMinor).map((d) => d.quality);
    expect(qualities).toEqual([
      "minor",
      "diminished",
      "major",
      "minor",
      "minor",
      "major",
      "major",
    ]);
  });
});

describe("relativeKey", () => {
  it("relative minor of C major is A natural minor", () => {
    const relative = relativeKey(cMajor);
    expect(relative.mode).toBe("natural-minor");
    expect(noteName(relative.tonic)).toBe("A");
  });

  it("relative major of A natural minor is C major", () => {
    const relative = relativeKey(aNaturalMinor);
    expect(relative.mode).toBe("major");
    expect(noteName(relative.tonic)).toBe("C");
  });

  it("round-trips back to the original key", () => {
    expect(relativeKey(relativeKey(cMajor))).toEqual(cMajor);
  });
});
