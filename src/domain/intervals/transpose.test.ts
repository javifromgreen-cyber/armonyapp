import { describe, expect, it } from "vitest";
import { noteName } from "../notes/note";
import { transposeNote } from "./transpose";

describe("transposeNote", () => {
  const C = { letter: "C" as const, accidental: 0 };

  it("transposes up by a whole step as a major second, not a diminished third", () => {
    expect(noteName(transposeNote(C, 2))).toBe("D");
  });

  it("transposes down by a whole step as Bb, not A#", () => {
    expect(noteName(transposeNote(C, -2))).toBe("Bb");
  });

  it("transposes up a semitone as a minor second (Db), by the textbook definition of m2", () => {
    expect(noteName(transposeNote(C, 1))).toBe("Db");
  });

  it("transposes down a semitone as B natural (the octave-inversion of a minor second)", () => {
    expect(noteName(transposeNote(C, -1))).toBe("B");
  });

  it("transposes up a fourth as F", () => {
    expect(noteName(transposeNote(C, 5))).toBe("F");
  });

  it("preserves pitch class across an octave", () => {
    expect(transposeNote(C, 12)).toEqual(C);
  });

  it("round-trips: transposing up then down by the same amount returns the original note", () => {
    for (const semitones of [1, 2, 3, 5, 7, 11, -4, -9]) {
      expect(transposeNote(transposeNote(C, semitones), -semitones)).toEqual(C);
    }
  });

  describe("the tritone (6 semitones is its own inversion — direction breaks the tie)", () => {
    it("spells an ascending tritone as an augmented fourth (F#)", () => {
      expect(noteName(transposeNote(C, 6))).toBe("F#");
    });

    it("spells a descending tritone as a diminished fifth (Gb)", () => {
      expect(noteName(transposeNote(C, -6))).toBe("Gb");
    });

    it("still round-trips despite the direction-dependent spelling", () => {
      expect(transposeNote(transposeNote(C, 6), -6)).toEqual(C);
      expect(transposeNote(transposeNote(C, -6), 6)).toEqual(C);
    });
  });
});
