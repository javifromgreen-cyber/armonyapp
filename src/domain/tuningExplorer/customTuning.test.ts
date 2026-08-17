import { describe, expect, it } from "vitest";
import { nearestMidiForPitchClass, resolveCustomStringMidi, standardReferenceMidis } from "./customTuning";
import { generateFretboard } from "./fretboard";
import { midiFromPitchClassAndOctave } from "../instruments/playablePitch";
import { noteToPitchClass, parseNoteName } from "../notes";

function midi(spec: string): number {
  const match = /^([A-G][#b]{0,2})(-?\d+)$/.exec(spec)!;
  return midiFromPitchClassAndOctave(noteToPitchClass(parseNoteName(match[1])), Number(match[2]));
}

describe("nearestMidiForPitchClass", () => {
  it("returns the reference unchanged when the target pitch class already matches", () => {
    const e2 = midi("E2");
    expect(nearestMidiForPitchClass(e2, 4)).toBe(e2); // E = pitch class 4
  });

  it("picks the nearest occurrence above when that is closer", () => {
    // Reference E2 (pc 4); target F (pc 5) is 1 semitone up -> F2.
    expect(nearestMidiForPitchClass(midi("E2"), 5)).toBe(midi("F2"));
  });

  it("picks the nearest occurrence below when that is closer", () => {
    // Reference E2 (pc 4); target D# (pc 3) is 1 semitone down -> D#2.
    expect(nearestMidiForPitchClass(midi("E2"), 3)).toBe(midi("D#2"));
  });

  it("never moves by more than 6 semitones (nearest, not just 'up')", () => {
    for (let referencePc = 0; referencePc < 12; referencePc++) {
      for (let targetPc = 0; targetPc < 12; targetPc++) {
        const reference = midiFromPitchClassAndOctave(referencePc, 3);
        const result = nearestMidiForPitchClass(reference, targetPc);
        expect(Math.abs(result - reference)).toBeLessThanOrEqual(6);
        expect(((result % 12) + 12) % 12).toBe(targetPc);
      }
    }
  });
});

describe("resolveCustomStringMidi (test 20)", () => {
  it("resolves deterministically to a sensible octave anchored to the standard reference", () => {
    // Electric guitar 6-string, string 0 = low E (E2). Changing its pitch
    // class to C (pc 0) should land near E2 -> C2 (nearest C to E2 is
    // 4 semitones down, not some arbitrary distant octave).
    const result = resolveCustomStringMidi("electricGuitar", 6, 0, 0);
    expect(result).toBe(midi("C2"));
  });

  it("is deterministic — calling it twice with the same inputs gives the same result", () => {
    const first = resolveCustomStringMidi("bass", 5, 2, 7);
    const second = resolveCustomStringMidi("bass", 5, 2, 7);
    expect(first).toBe(second);
  });

  it("always anchors to the STANDARD reference, never a previously-drifted custom value", () => {
    const reference = standardReferenceMidis("electricGuitar", 6)[0];
    const afterOneEdit = resolveCustomStringMidi("electricGuitar", 6, 0, 1); // -> C#/Db near E2
    const afterEditingBackToSamePitchClass = resolveCustomStringMidi("electricGuitar", 6, 0, 4); // -> E again
    expect(afterEditingBackToSamePitchClass).toBe(reference);
    expect(afterOneEdit).not.toBe(reference);
  });
});

describe("21 — changing one custom string rebuilds fret pitches correctly", () => {
  it("regenerating the fretboard after a single-string custom edit only changes that string's column", () => {
    const original = standardReferenceMidis("electricGuitar", 6);
    const edited = [...original];
    edited[5] = resolveCustomStringMidi("electricGuitar", 6, 5, 0); // change the high string's pitch class to C

    const originalBoard = generateFretboard(original, 24);
    const editedBoard = generateFretboard(edited, 24);

    // Strings 0-4 are untouched.
    for (let stringIndex = 0; stringIndex < 5; stringIndex++) {
      expect(editedBoard[stringIndex]).toEqual(originalBoard[stringIndex]);
    }
    // String 5 (the edited one) changed, and every fret on it still follows pitch = open + fret.
    expect(editedBoard[5][0].midi).toBe(edited[5]);
    expect(editedBoard[5][12].midi).toBe(edited[5] + 12);
    expect(editedBoard[5]).not.toEqual(originalBoard[5]);
  });
});
