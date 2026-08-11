import { describe, expect, it } from "vitest";
import { midiFromPitchClassAndOctave, frequencyFromMidi } from "./pitch";

describe("midiFromPitchClassAndOctave", () => {
  it("C4 (middle C) is MIDI 60", () => {
    expect(midiFromPitchClassAndOctave(0, 4)).toBe(60);
  });

  it("A4 is MIDI 69", () => {
    expect(midiFromPitchClassAndOctave(9, 4)).toBe(69);
  });

  it("C0 is MIDI 12", () => {
    expect(midiFromPitchClassAndOctave(0, 0)).toBe(12);
  });
});

describe("frequencyFromMidi", () => {
  it("A4 (MIDI 69) is 440Hz", () => {
    expect(frequencyFromMidi(69)).toBeCloseTo(440, 5);
  });

  it("an octave up doubles frequency", () => {
    expect(frequencyFromMidi(81)).toBeCloseTo(880, 5);
  });

  it("an octave down halves frequency", () => {
    expect(frequencyFromMidi(57)).toBeCloseTo(220, 5);
  });

  it("C4 (middle C) is approximately 261.63Hz", () => {
    expect(frequencyFromMidi(60)).toBeCloseTo(261.63, 1);
  });
});
