import { describe, expect, it } from "vitest";
import { parseNoteName } from "@/domain/notes";
import { openStringPitchClass, pitchAtFret, fretForPitchClass } from "./tuning";
import { STRING_NUMBERS } from "./types";

describe("openStringPitchClass — standard tuning E2 A2 D3 G3 B3 E4", () => {
  it("string 6 (low E) and string 1 (high E) share pitch class E", () => {
    expect(openStringPitchClass(6)).toBe(openStringPitchClass(1));
  });

  it("matches the documented pitch classes for every string", () => {
    expect(openStringPitchClass(6)).toBe(4); // E
    expect(openStringPitchClass(5)).toBe(9); // A
    expect(openStringPitchClass(4)).toBe(2); // D
    expect(openStringPitchClass(3)).toBe(7); // G
    expect(openStringPitchClass(2)).toBe(11); // B
    expect(openStringPitchClass(1)).toBe(4); // E
  });
});

describe("pitchAtFret", () => {
  it("open string 6 (fret 0) is E2 — MIDI 40", () => {
    const pitch = pitchAtFret(6, 0, parseNoteName("E"));
    expect(pitch.midi).toBe(40);
    expect(pitch.octave).toBe(2);
  });

  it("open string 1 (fret 0) is E4 — MIDI 64", () => {
    const pitch = pitchAtFret(1, 0, parseNoteName("E"));
    expect(pitch.midi).toBe(64);
  });

  it("fret 12 on any string is exactly one octave above the open string", () => {
    const open = pitchAtFret(5, 0, parseNoteName("A"));
    const twelfth = pitchAtFret(5, 12, parseNoteName("A"));
    expect(twelfth.midi).toBe(open.midi + 12);
  });

  it("string 5 fret 3 is C3 (the classic C-major-shape bass note)", () => {
    const pitch = pitchAtFret(5, 3, parseNoteName("C"));
    expect(pitch.midi).toBe(48); // C3
  });

  it("carries the exact spelled note passed in, not a re-derived one", () => {
    const pitch = pitchAtFret(2, 1, parseNoteName("Db"));
    expect(pitch.note).toEqual(parseNoteName("Db"));
  });
});

describe("fretForPitchClass", () => {
  it("string 6 reaches E (its own open pitch class) at fret 0", () => {
    expect(fretForPitchClass(6, 4)).toBe(0);
  });

  it("string 5 reaches C at fret 3", () => {
    expect(fretForPitchClass(5, 0)).toBe(3); // C = pitch class 0
  });

  it("string 4 reaches E at fret 2", () => {
    expect(fretForPitchClass(4, 4)).toBe(2);
  });

  it("always returns a value in [0, 11]", () => {
    for (const string of STRING_NUMBERS) {
      for (let pc = 0; pc < 12; pc++) {
        const fret = fretForPitchClass(string, pc);
        expect(fret).toBeGreaterThanOrEqual(0);
        expect(fret).toBeLessThanOrEqual(11);
      }
    }
  });
});
