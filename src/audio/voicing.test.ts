import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { neutralVoicing, DEFAULT_ROOT_OCTAVE } from "./voicing";
import { midiFromPitchClassAndOctave } from "@/domain/instruments/playablePitch";

describe("neutralVoicing", () => {
  it("Cmaj7 voices as a close-position stack ascending from the root octave", () => {
    const pitches = neutralVoicing(parseChordSymbol("Cmaj7"));
    const midis = pitches.map((p) => p.midi);
    // C4 E4 G4 B4 — each tone naturally ascends within the root octave already.
    expect(midis).toEqual([
      midiFromPitchClassAndOctave(0, 4), // C4
      midiFromPitchClassAndOctave(4, 4), // E4
      midiFromPitchClassAndOctave(7, 4), // G4
      midiFromPitchClassAndOctave(11, 4), // B4
    ]);
  });

  it("every tone strictly ascends (never descends or repeats a pitch)", () => {
    const pitches = neutralVoicing(parseChordSymbol("Am7"));
    for (let i = 1; i < pitches.length; i++) {
      expect(pitches[i].midi).toBeGreaterThan(pitches[i - 1].midi);
    }
  });

  it("bumps a tone up an octave when it would otherwise sit below the previous tone (Am)", () => {
    // A(root) C(b3) E(5): C and E are below A's pitch class, so each must
    // jump to the next octave up to stay ascending — but only the minimum
    // needed, not further.
    const pitches = neutralVoicing(parseChordSymbol("Am"));
    const midis = pitches.map((p) => p.midi);
    expect(midis).toEqual([
      midiFromPitchClassAndOctave(9, 4), // A4
      midiFromPitchClassAndOctave(0, 5), // C5 (bumped from C4)
      midiFromPitchClassAndOctave(4, 5), // E5 (bumped from E4)
    ]);
  });

  it("stays compact — the full voicing never spans more than an octave and a half for a triad/7th", () => {
    for (const symbol of ["C", "Am", "Cmaj7", "G7", "Bdim", "Fmaj7"]) {
      const pitches = neutralVoicing(parseChordSymbol(symbol));
      const span = pitches[pitches.length - 1].midi - pitches[0].midi;
      expect(span).toBeLessThanOrEqual(18); // an octave and a half
    }
  });

  it("respects an explicit root octave", () => {
    const pitches = neutralVoicing(parseChordSymbol("C"), 3);
    expect(pitches[0].midi).toBe(midiFromPitchClassAndOctave(0, 3));
  });

  it("defaults to DEFAULT_ROOT_OCTAVE (a compact, non-muddy register)", () => {
    const pitches = neutralVoicing(parseChordSymbol("C"));
    expect(pitches[0].midi).toBe(midiFromPitchClassAndOctave(0, DEFAULT_ROOT_OCTAVE));
  });

  it("frequencyHz is consistent with the midi value for every pitch", () => {
    const pitches = neutralVoicing(parseChordSymbol("Cmaj7"));
    for (const pitch of pitches) {
      expect(pitch.frequencyHz).toBeCloseTo(440 * Math.pow(2, (pitch.midi - 69) / 12), 5);
    }
  });
});
