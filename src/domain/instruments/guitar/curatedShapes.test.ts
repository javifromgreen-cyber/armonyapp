import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordNotes } from "@/domain/chords";
import { noteToPitchClass, noteName } from "@/domain/notes";
import { curatedFretsFor } from "./curatedShapes";
import { chordToneTable, buildStringSound } from "./chordTones";
import { STRING_NUMBERS } from "./types";

function soundingPitchClasses(chord: ReturnType<typeof parseChordSymbol>): number[] {
  const frets = curatedFretsFor(chord)!;
  const tones = chordToneTable(chord);
  const result: number[] = [];
  frets.forEach((fret, index) => {
    if (fret === "x") return;
    const stringNumber = STRING_NUMBERS[index];
    const sound = buildStringSound(stringNumber, fret, tones);
    expect(sound).toBeDefined(); // every curated fret must land on a real chord tone
    result.push(noteToPitchClass(sound!.pitch!.note));
  });
  return result;
}

describe("curated open shapes — every fret lands on an actual chord tone", () => {
  const cases: [string, string[]][] = [
    ["C", ["C", "E", "G"]],
    ["A", ["A", "C#", "E"]],
    ["G", ["G", "B", "D"]],
    ["E", ["E", "G#", "B"]],
    ["D", ["D", "F#", "A"]],
    ["Am", ["A", "C", "E"]],
    ["Em", ["E", "G", "B"]],
    ["Dm", ["D", "F", "A"]],
  ];

  it.each(cases)("%s only sounds its own chord tones, with the root present", (symbol, expectedNoteNames) => {
    const chord = parseChordSymbol(symbol);
    const expectedPitchClasses = new Set(
      chordNotes(chord).map(noteToPitchClass),
    );
    expect(chordNotes(chord).map(noteName).sort()).toEqual([...expectedNoteNames].sort());

    const sounding = soundingPitchClasses(chord);
    expect(sounding.length).toBeGreaterThanOrEqual(3);
    for (const pc of sounding) {
      expect(expectedPitchClasses.has(pc)).toBe(true);
    }
    expect(sounding).toContain(noteToPitchClass(chord.root));
  });

  it("has exactly one curated shape for each of the 8 named chords, no more", () => {
    for (const [symbol] of cases) {
      expect(curatedFretsFor(parseChordSymbol(symbol))).toBeDefined();
    }
  });

  it("returns undefined for a chord quality with no curated shape (e.g. Cmaj7)", () => {
    expect(curatedFretsFor(parseChordSymbol("Cmaj7"))).toBeUndefined();
  });

  it("returns undefined for a major/minor chord whose root has no curated shape (e.g. F, Bb)", () => {
    expect(curatedFretsFor(parseChordSymbol("F"))).toBeUndefined();
    expect(curatedFretsFor(parseChordSymbol("Bb"))).toBeUndefined();
  });
});
