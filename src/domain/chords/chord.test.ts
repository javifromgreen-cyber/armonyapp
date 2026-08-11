import { describe, expect, it } from "vitest";
import { noteName, parseNoteName } from "../notes/note";
import {
  buildChord,
  chordNotes,
  chordSymbol,
  parseChordSymbol,
  transposeChord,
  ChordParseError,
} from "./chord";
import { CHORD_QUALITY_IDS, CHORD_QUALITIES } from "./chordQuality";

function names(root: string, qualityId: (typeof CHORD_QUALITY_IDS)[number]) {
  return chordNotes(buildChord(parseNoteName(root), qualityId)).map(noteName);
}

describe("chordNotes — product-spec worked examples", () => {
  it("Am7 = A C E G", () => {
    expect(names("A", "minor7")).toEqual(["A", "C", "E", "G"]);
  });

  it("G7 = G B D F", () => {
    expect(names("G", "dominant7")).toEqual(["G", "B", "D", "F"]);
  });
});

describe("chordNotes — full v1.0 catalogue rooted on C", () => {
  const expected: Record<(typeof CHORD_QUALITY_IDS)[number], string[]> = {
    major: ["C", "E", "G"],
    minor: ["C", "Eb", "G"],
    diminished: ["C", "Eb", "Gb"],
    augmented: ["C", "E", "G#"],
    sus2: ["C", "D", "G"],
    sus4: ["C", "F", "G"],
    maj7: ["C", "E", "G", "B"],
    dominant7: ["C", "E", "G", "Bb"],
    minor7: ["C", "Eb", "G", "Bb"],
    minor7flat5: ["C", "Eb", "Gb", "Bb"],
    diminished7: ["C", "Eb", "Gb", "Bbb"],
    add9: ["C", "E", "G", "D"],
    six: ["C", "E", "G", "A"],
    minorSix: ["C", "Eb", "G", "A"],
    nine: ["C", "E", "G", "Bb", "D"],
    minorNine: ["C", "Eb", "G", "Bb", "D"],
    majorNine: ["C", "E", "G", "B", "D"],
  };

  for (const id of CHORD_QUALITY_IDS) {
    it(`C${CHORD_QUALITIES[id].suffixes[0]} = ${expected[id].join(" ")}`, () => {
      expect(names("C", id)).toEqual(expected[id]);
    });
  }
});

describe("diminished7 double-flat seventh (documented assumption)", () => {
  it("spells the diminished seventh as Bbb, not the enharmonic A", () => {
    // The fully-diminished 7th is, by formula, a doubly-diminished interval
    // above the root (bb7). This is the theoretically correct spelling; some
    // real-world engraving simplifies it to the enharmonic equivalent. See
    // docs/music-engine.md.
    expect(names("C", "diminished7")).toContain("Bbb");
  });
});

describe("parseChordSymbol / chordSymbol round-trip", () => {
  const symbols = [
    "C",
    "Cm",
    "Cdim",
    "Caug",
    "Csus2",
    "Csus4",
    "Cmaj7",
    "C7",
    "Cm7",
    "Cm7b5",
    "Cdim7",
    "Cadd9",
    "C6",
    "Cm6",
    "C9",
    "Cm9",
    "Cmaj9",
    "F#m7",
    "Bbmaj7",
  ];

  for (const symbol of symbols) {
    it(`round-trips ${symbol}`, () => {
      expect(chordSymbol(parseChordSymbol(symbol))).toBe(symbol);
    });
  }

  it("accepts common aliases without them becoming canonical", () => {
    expect(chordSymbol(parseChordSymbol("Cmin7"))).toBe("Cm7");
    expect(chordSymbol(parseChordSymbol("CM7"))).toBe("Cmaj7");
  });

  it("rejects an invalid root", () => {
    expect(() => parseChordSymbol("H7")).toThrow(ChordParseError);
  });

  it("rejects an unrecognized quality suffix", () => {
    expect(() => parseChordSymbol("Cxyz")).toThrow(ChordParseError);
  });
});

describe("transposeChord", () => {
  it("Cmaj7 + 2 semitones -> Dmaj7 (product-spec worked example)", () => {
    const transposed = transposeChord(parseChordSymbol("Cmaj7"), 2);
    expect(chordSymbol(transposed)).toBe("Dmaj7");
    expect(names("D", "maj7")).toEqual(
      chordNotes(transposed).map(noteName),
    );
  });

  it("preserves quality while moving the root", () => {
    const transposed = transposeChord(parseChordSymbol("Am7"), 3);
    expect(chordSymbol(transposed)).toBe("Cm7");
  });

  it("transposing by 12 semitones is a no-op", () => {
    const chord = parseChordSymbol("F#m7b5");
    expect(transposeChord(chord, 12)).toEqual(chord);
  });
});
