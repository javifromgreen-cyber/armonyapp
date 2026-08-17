import { describe, expect, it } from "vitest";
import { generateFretboard, pitchAt, displayNameFor } from "./fretboard";
import { maxFretFor } from "./instrumentConfig";
import { defaultPresetFor } from "./tuningPresets";
import { midiFromPitchClassAndOctave } from "../instruments/playablePitch";
import { noteToPitchClass, parseNoteName } from "../notes";

function midi(spec: string): number {
  const match = /^([A-G][#b]{0,2})(-?\d+)$/.exec(spec)!;
  return midiFromPitchClassAndOctave(noteToPitchClass(parseNoteName(match[1])), Number(match[2]));
}

describe("generateFretboard", () => {
  it("1 — E Standard 6-string fret 0 produces E2 A2 D3 G3 B3 E4", () => {
    const preset = defaultPresetFor("electricGuitar", 6);
    const board = generateFretboard(preset.openStringsMidi, 24);
    const openNotes = board.map((string) => string[0].midi);
    expect(openNotes).toEqual(["E2", "A2", "D3", "G3", "B3", "E4"].map(midi));
  });

  it("2 — electric 6-string has frets 0-24", () => {
    const maxFret = maxFretFor("electricGuitar");
    expect(maxFret).toBe(24);
    const board = generateFretboard(defaultPresetFor("electricGuitar", 6).openStringsMidi, maxFret);
    for (const string of board) {
      expect(string).toHaveLength(25); // 0..24 inclusive
      expect(string[0].fret).toBe(0);
      expect(string[string.length - 1].fret).toBe(24);
    }
  });

  it("3 — acoustic has frets 0-22", () => {
    const maxFret = maxFretFor("acousticGuitar");
    expect(maxFret).toBe(22);
    const board = generateFretboard(defaultPresetFor("acousticGuitar", 6).openStringsMidi, maxFret);
    for (const string of board) {
      expect(string).toHaveLength(23); // 0..22 inclusive
    }
  });

  it("4 — bass has frets 0-24", () => {
    const maxFret = maxFretFor("bass");
    expect(maxFret).toBe(24);
    const board = generateFretboard(defaultPresetFor("bass", 4).openStringsMidi, maxFret);
    for (const string of board) {
      expect(string).toHaveLength(25);
    }
  });

  it("5 — fret pitch = open MIDI + fret, for every position", () => {
    const openStringsMidi = defaultPresetFor("electricGuitar", 6).openStringsMidi;
    const board = generateFretboard(openStringsMidi, 24);
    board.forEach((string, stringIndex) => {
      string.forEach((position) => {
        expect(position.midi).toBe(openStringsMidi[stringIndex] + position.fret);
      });
    });
  });

  it("6 — octave transition is correct (B -> C etc.)", () => {
    // Open B string (bass 5-string B Standard, string 0 = B0) at fret 1 must land on C1.
    const openStringsMidi = defaultPresetFor("bass", 5).openStringsMidi;
    const b0 = pitchAt(openStringsMidi, 0, 0);
    const c1 = pitchAt(openStringsMidi, 0, 1);
    expect(displayNameFor(b0, "sharp")).toBe("B");
    expect(displayNameFor(c1, "sharp")).toBe("C");
    expect(c1.midi - b0.midi).toBe(1);
  });

  it("7 — fret 12 is one octave above fret 0", () => {
    const openStringsMidi = defaultPresetFor("electricGuitar", 6).openStringsMidi;
    openStringsMidi.forEach((openMidi, stringIndex) => {
      const fret12 = pitchAt(openStringsMidi, stringIndex, 12);
      expect(fret12.midi - openMidi).toBe(12);
      expect(fret12.pitchClass).toBe(pitchAt(openStringsMidi, stringIndex, 0).pitchClass);
    });
  });

  it("8 — fret 24 is two octaves above fret 0", () => {
    const openStringsMidi = defaultPresetFor("electricGuitar", 6).openStringsMidi;
    openStringsMidi.forEach((openMidi, stringIndex) => {
      const fret24 = pitchAt(openStringsMidi, stringIndex, 24);
      expect(fret24.midi - openMidi).toBe(24);
    });
  });
});

describe("displayNameFor", () => {
  it("respects the sharp/flat toggle without changing pitch", () => {
    const position = pitchAt([midi("C2")], 0, 1); // C#2 / Db2
    expect(displayNameFor(position, "sharp")).toBe("C#");
    expect(displayNameFor(position, "flat")).toBe("Db");
  });
});
