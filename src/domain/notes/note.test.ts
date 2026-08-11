import { describe, expect, it } from "vitest";
import { noteToPitchClass, spellPitchClass, noteName, parseNoteName, NoteParseError } from "./note";

describe("noteToPitchClass", () => {
  it("resolves natural notes", () => {
    expect(noteToPitchClass({ letter: "C", accidental: 0 })).toBe(0);
    expect(noteToPitchClass({ letter: "A", accidental: 0 })).toBe(9);
  });

  it("resolves sharps and flats", () => {
    expect(noteToPitchClass({ letter: "F", accidental: 1 })).toBe(6); // F#
    expect(noteToPitchClass({ letter: "G", accidental: -1 })).toBe(6); // Gb
    expect(noteToPitchClass({ letter: "B", accidental: 1 })).toBe(0); // B# == C
  });

  it("wraps double accidentals correctly", () => {
    expect(noteToPitchClass({ letter: "B", accidental: -2 })).toBe(9); // Bbb == A
    expect(noteToPitchClass({ letter: "C", accidental: -1 })).toBe(11); // Cb == B
  });
});

describe("spellPitchClass — context-dependent enharmonic spelling", () => {
  it("spells the same pitch class differently depending on the requested letter", () => {
    // pitch class 6 is F# in an F-context and Gb in a G-context — the caller's
    // musical context (scale degree, key) decides, never a hardcoded preference.
    expect(spellPitchClass(6, "F")).toEqual({ letter: "F", accidental: 1 });
    expect(spellPitchClass(6, "G")).toEqual({ letter: "G", accidental: -1 });
  });

  it("spells pitch class 1 as Db or C# depending on context", () => {
    expect(spellPitchClass(1, "D")).toEqual({ letter: "D", accidental: -1 });
    expect(spellPitchClass(1, "C")).toEqual({ letter: "C", accidental: 1 });
  });

  it("keeps accidentals within a small range for musically sane requests", () => {
    expect(spellPitchClass(0, "B")).toEqual({ letter: "B", accidental: 1 }); // B#
    expect(spellPitchClass(11, "C")).toEqual({ letter: "C", accidental: -1 }); // Cb
  });
});

describe("noteName", () => {
  it("formats naturals, sharps and flats", () => {
    expect(noteName({ letter: "C", accidental: 0 })).toBe("C");
    expect(noteName({ letter: "F", accidental: 1 })).toBe("F#");
    expect(noteName({ letter: "B", accidental: -2 })).toBe("Bbb");
    expect(noteName({ letter: "G", accidental: 2 })).toBe("G##");
  });
});

describe("parseNoteName", () => {
  it("round-trips through noteName", () => {
    for (const input of ["C", "F#", "Bb", "G##", "Dbb"]) {
      expect(noteName(parseNoteName(input))).toBe(input);
    }
  });

  it("rejects invalid note names", () => {
    expect(() => parseNoteName("H")).toThrow(NoteParseError);
    expect(() => parseNoteName("C#b")).toThrow(NoteParseError);
    expect(() => parseNoteName("")).toThrow(NoteParseError);
  });
});
