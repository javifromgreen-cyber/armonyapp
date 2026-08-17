import { describe, expect, it } from "vitest";
import { noteForPitchClass } from "./chromaticSpelling";
import { noteName, noteToPitchClass } from "./note";

describe("noteForPitchClass", () => {
  it("renders sharp names correctly (test 16)", () => {
    const names = Array.from({ length: 12 }, (_, pc) => noteName(noteForPitchClass(pc, "sharp")));
    expect(names).toEqual(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
  });

  it("renders flat names correctly (test 17)", () => {
    const names = Array.from({ length: 12 }, (_, pc) => noteName(noteForPitchClass(pc, "flat")));
    expect(names).toEqual(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
  });

  it("switching notation changes the label but never the underlying pitch class (test 18)", () => {
    for (let pc = 0; pc < 12; pc++) {
      const sharp = noteForPitchClass(pc, "sharp");
      const flat = noteForPitchClass(pc, "flat");
      expect(noteToPitchClass(sharp)).toBe(pc);
      expect(noteToPitchClass(flat)).toBe(pc);
    }
  });

  it("naturals render identically under both notations", () => {
    for (const pc of [0, 2, 4, 5, 7, 9, 11]) {
      expect(noteName(noteForPitchClass(pc, "sharp"))).toBe(noteName(noteForPitchClass(pc, "flat")));
    }
  });
});
