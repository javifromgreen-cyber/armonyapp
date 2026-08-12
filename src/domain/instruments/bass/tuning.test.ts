import { describe, expect, it } from "vitest";
import { parseNoteName } from "@/domain/notes";
import { openStringPitchClass, pitchAtFret, fretForPitchClass } from "./tuning";
import { BASS_STRING_NUMBERS } from "./types";

describe("openStringPitchClass — standard 4-string tuning E1 A1 D2 G2", () => {
  it("matches the documented pitch classes for every string", () => {
    expect(openStringPitchClass(4)).toBe(4); // E
    expect(openStringPitchClass(3)).toBe(9); // A
    expect(openStringPitchClass(2)).toBe(2); // D
    expect(openStringPitchClass(1)).toBe(7); // G
  });

  it("each open string is a perfect 4th (5 semitones) above the previous, standard bass tuning", () => {
    expect(openStringPitchClass(3)).toBe((openStringPitchClass(4) + 5) % 12);
    expect(openStringPitchClass(2)).toBe((openStringPitchClass(3) + 5) % 12);
    expect(openStringPitchClass(1)).toBe((openStringPitchClass(2) + 5) % 12);
  });
});

describe("pitchAtFret", () => {
  it("open string 4 (fret 0) is E1 — MIDI 28", () => {
    const pitch = pitchAtFret(4, 0, parseNoteName("E"));
    expect(pitch.midi).toBe(28);
    expect(pitch.octave).toBe(1);
  });

  it("open string 3 (fret 0) is A1 — MIDI 33", () => {
    expect(pitchAtFret(3, 0, parseNoteName("A")).midi).toBe(33);
  });

  it("open string 2 (fret 0) is D2 — MIDI 38", () => {
    expect(pitchAtFret(2, 0, parseNoteName("D")).midi).toBe(38);
  });

  it("open string 1 (fret 0) is G2 — MIDI 43", () => {
    expect(pitchAtFret(1, 0, parseNoteName("G")).midi).toBe(43);
  });

  it("fret 12 on any string is exactly one octave above the open string", () => {
    const open = pitchAtFret(3, 0, parseNoteName("A"));
    const twelfth = pitchAtFret(3, 12, parseNoteName("A"));
    expect(twelfth.midi).toBe(open.midi + 12);
  });

  it("string 4 fret 3 is G1 (a common root position for G)", () => {
    const pitch = pitchAtFret(4, 3, parseNoteName("G"));
    expect(pitch.midi).toBe(31); // G1
  });

  it("carries the exact spelled note passed in, not a re-derived one", () => {
    const pitch = pitchAtFret(2, 1, parseNoteName("Eb"));
    expect(pitch.note).toEqual(parseNoteName("Eb"));
  });
});

describe("fretForPitchClass", () => {
  it("string 4 reaches E (its own open pitch class) at fret 0", () => {
    expect(fretForPitchClass(4, 4)).toBe(0);
  });

  it("string 4 reaches C at fret 8", () => {
    expect(fretForPitchClass(4, 0)).toBe(8); // C = pitch class 0
  });

  it("string 3 reaches C at fret 3", () => {
    expect(fretForPitchClass(3, 0)).toBe(3);
  });

  it("always returns a value in [0, 11]", () => {
    for (const string of BASS_STRING_NUMBERS) {
      for (let pc = 0; pc < 12; pc++) {
        const fret = fretForPitchClass(string, pc);
        expect(fret).toBeGreaterThanOrEqual(0);
        expect(fret).toBeLessThanOrEqual(11);
      }
    }
  });
});
