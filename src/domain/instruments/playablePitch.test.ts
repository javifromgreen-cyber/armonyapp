import { describe, expect, it } from "vitest";
import { parseNoteName } from "@/domain/notes";
import {
  midiFromPitchClassAndOctave,
  frequencyFromMidi,
  playablePitch,
  playablePitchOneOctaveUp,
  stackAscending,
} from "./playablePitch";

describe("midiFromPitchClassAndOctave", () => {
  it("C4 (middle C) is MIDI 60", () => {
    expect(midiFromPitchClassAndOctave(0, 4)).toBe(60);
  });

  it("A4 is MIDI 69", () => {
    expect(midiFromPitchClassAndOctave(9, 4)).toBe(69);
  });
});

describe("frequencyFromMidi", () => {
  it("A4 (MIDI 69) is 440Hz", () => {
    expect(frequencyFromMidi(69)).toBeCloseTo(440, 5);
  });

  it("an octave up doubles frequency", () => {
    expect(frequencyFromMidi(81)).toBeCloseTo(880, 5);
  });
});

describe("playablePitch", () => {
  it("carries the spelled note, not just its pitch class", () => {
    const pitch = playablePitch(parseNoteName("Db"), 4);
    expect(pitch.note).toEqual(parseNoteName("Db"));
    expect(pitch.midi).toBe(61);
  });

  it("Db and C# are the same pitch (midi/frequency) but keep distinct spelling", () => {
    const db = playablePitch(parseNoteName("Db"), 4);
    const cSharp = playablePitch(parseNoteName("C#"), 4);
    expect(db.midi).toBe(cSharp.midi);
    expect(db.note.letter).not.toBe(cSharp.note.letter);
  });
});

describe("playablePitchOneOctaveUp", () => {
  it("raises midi by exactly 12 and doubles frequency", () => {
    const base = playablePitch(parseNoteName("C"), 4);
    const up = playablePitchOneOctaveUp(base);
    expect(up.midi).toBe(base.midi + 12);
    expect(up.octave).toBe(base.octave + 1);
    expect(up.frequencyHz).toBeCloseTo(base.frequencyHz * 2, 5);
  });
});

describe("stackAscending", () => {
  it("Cmaj7 formula order stacks entirely within the start octave (C4 E4 G4 B4)", () => {
    const notes = ["C", "E", "G", "B"].map(parseNoteName);
    const pitches = stackAscending(notes, 4);
    expect(pitches.map((p) => p.octave)).toEqual([4, 4, 4, 4]);
    expect(pitches.map((p) => p.midi)).toEqual([60, 64, 67, 71]);
  });

  it("bumps a tone to the next octave when it would otherwise sit below the previous tone", () => {
    // A(root) C E — C and E are pitch-class-below A, so both must jump up.
    const notes = ["A", "C", "E"].map(parseNoteName);
    const pitches = stackAscending(notes, 4);
    expect(pitches.map((p) => p.octave)).toEqual([4, 5, 5]);
  });

  it("every tone strictly ascends", () => {
    const notes = ["G", "B", "D", "F"].map(parseNoteName);
    const pitches = stackAscending(notes, 4);
    for (let i = 1; i < pitches.length; i++) {
      expect(pitches[i].midi).toBeGreaterThan(pitches[i - 1].midi);
    }
  });

  it("an empty note list produces an empty pitch list", () => {
    expect(stackAscending([], 4)).toEqual([]);
  });
});
