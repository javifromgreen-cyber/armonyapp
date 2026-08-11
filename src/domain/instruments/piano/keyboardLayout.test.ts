import { describe, expect, it } from "vitest";
import { computeKeyboardLayout, keyboardRangeForPitches } from "./keyboardLayout";
import { playablePitch } from "../playablePitch";
import { parseNoteName } from "@/domain/notes";

describe("computeKeyboardLayout", () => {
  it("one octave (C4-B4, MIDI 60-71) produces exactly 7 white keys and 5 black keys", () => {
    const layout = computeKeyboardLayout(60, 71);
    expect(layout.whiteKeys).toHaveLength(7);
    expect(layout.blackKeys).toHaveLength(5);
    expect(layout.totalWidth).toBe(7);
  });

  it("white keys are laid out sequentially with no gaps or overlaps", () => {
    const layout = computeKeyboardLayout(60, 83); // two full octaves
    layout.whiteKeys.forEach((key, index) => {
      expect(key.x).toBe(index);
      expect(key.width).toBe(1);
    });
  });

  it("white keys are in ascending MIDI order matching their x position", () => {
    const layout = computeKeyboardLayout(60, 71);
    const midis = layout.whiteKeys.map((k) => k.midi);
    expect(midis).toEqual([60, 62, 64, 65, 67, 69, 71]); // C D E F G A B
  });

  it("each black key sits centered on the boundary between its two white neighbors", () => {
    const layout = computeKeyboardLayout(60, 71);
    const cSharp = layout.blackKeys.find((k) => k.midi === 61)!; // between C4(x=0) and D4(x=1)
    const center = cSharp.x + cSharp.width / 2;
    expect(center).toBeCloseTo(1, 5);
  });

  it("no black key exists between E/F or B/C (the two natural half-step pairs)", () => {
    const layout = computeKeyboardLayout(60, 71);
    const blackMidis = layout.blackKeys.map((k) => k.midi);
    expect(blackMidis).not.toContain(65 - 1); // no black key just below F4
    expect(blackMidis).not.toContain(60 - 1 + 12); // no black key just below the next C
  });

  it("black keys never overlap white key boundaries awkwardly — every black key's center falls strictly between two consecutive white key x-positions", () => {
    const layout = computeKeyboardLayout(60, 83);
    for (const black of layout.blackKeys) {
      const center = black.x + black.width / 2;
      expect(center).toBeGreaterThan(0);
      expect(Number.isInteger(center)).toBe(true); // centered exactly on a white-key boundary
    }
  });

  it("handles a range that starts or ends mid-octave without throwing", () => {
    expect(() => computeKeyboardLayout(61, 70)).not.toThrow();
    const layout = computeKeyboardLayout(61, 70);
    expect(layout.whiteKeys.length + layout.blackKeys.length).toBeGreaterThan(0);
  });
});

describe("keyboardRangeForPitches", () => {
  it("pads the voicing's span on each side and snaps outward to white keys", () => {
    const pitches = [
      playablePitch(parseNoteName("C"), 4),
      playablePitch(parseNoteName("E"), 4),
      playablePitch(parseNoteName("G"), 4),
      playablePitch(parseNoteName("B"), 4),
    ];
    const range = keyboardRangeForPitches(pitches, 2);
    expect(range.minMidi).toBeLessThanOrEqual(58); // C4(60) - 2
    expect(range.maxMidi).toBeGreaterThanOrEqual(73); // B4(71) + 2
  });

  it("the returned range always starts and ends on a white key", () => {
    const pitches = [playablePitch(parseNoteName("C#"), 4)];
    const range = keyboardRangeForPitches(pitches, 1);
    const layout = computeKeyboardLayout(range.minMidi, range.maxMidi);
    expect(layout.whiteKeys[0].midi).toBe(range.minMidi);
    expect(layout.whiteKeys[layout.whiteKeys.length - 1].midi).toBe(range.maxMidi);
  });

  it("a wider padding produces a wider (or equal) range than a tighter one", () => {
    const pitches = [playablePitch(parseNoteName("C"), 4), playablePitch(parseNoteName("G"), 4)];
    const tight = keyboardRangeForPitches(pitches, 1);
    const wide = keyboardRangeForPitches(pitches, 4);
    expect(wide.maxMidi - wide.minMidi).toBeGreaterThanOrEqual(tight.maxMidi - tight.minMidi);
  });
});
