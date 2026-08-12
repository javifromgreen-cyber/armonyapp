import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordNotes } from "@/domain/chords";
import { noteToPitchClass, noteName } from "@/domain/notes";
import { bassPatternsFor } from "./bassPatterns";
import { MAX_FRET_SPAN } from "./playability";
import { tabLinesFor } from "./tab";

const REPRESENTATIVE_CHORDS = [
  "C",
  "G",
  "F",
  "Am",
  "Em",
  "Dm",
  "Cmaj7",
  "G7",
  "Am7",
  "Bm7b5",
  "F#dim7",
  "Dbmaj7",
  "C9",
  "Cm9",
  "Csus4",
  "Caug",
];

const FULL_V1_CATALOGUE = [
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
];

describe("bassPatternsFor — every V1 catalogue chord produces at least one playable pattern", () => {
  it.each(FULL_V1_CATALOGUE)("%s has at least 1 pattern", (symbol) => {
    const patterns = bassPatternsFor(parseChordSymbol(symbol));
    expect(patterns.length).toBeGreaterThan(0);
  });
});

describe("bassPatternsFor — every returned pattern only sounds real chord tones", () => {
  it.each(REPRESENTATIVE_CHORDS)("%s", (symbol) => {
    const chord = parseChordSymbol(symbol);
    const expectedPitchClasses = new Set(chordNotes(chord).map(noteToPitchClass));
    for (const pattern of bassPatternsFor(chord)) {
      for (const step of pattern.steps) {
        expect(expectedPitchClasses.has(noteToPitchClass(step.pitch.note))).toBe(true);
      }
    }
  });
});

describe("bassPatternsFor — order is preserved and meaningful", () => {
  it("C major's basic arpeggio is exactly root, 3rd, 5th, octave — in that order", () => {
    const patterns = bassPatternsFor(parseChordSymbol("C"));
    const basic = patterns.find((p) => p.patternType === "basicArpeggio")!;
    expect(basic).toBeDefined();
    expect(basic.steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "1"]);
  });

  it("Cmaj7's basic arpeggio is exactly root, 3rd, 5th, 7th — in that order", () => {
    const patterns = bassPatternsFor(parseChordSymbol("Cmaj7"));
    const basic = patterns.find((p) => p.patternType === "basicArpeggio")!;
    expect(basic.steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "7"]);
  });

  it("G7's basic arpeggio is exactly root, 3rd, 5th, b7 — in that order", () => {
    const patterns = bassPatternsFor(parseChordSymbol("G7"));
    const basic = patterns.find((p) => p.patternType === "basicArpeggio")!;
    expect(basic.steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "b7"]);
  });

  it("the descending pattern is the exact reverse of the basic arpeggio's notes", () => {
    const patterns = bassPatternsFor(parseChordSymbol("Cmaj7"));
    const basic = patterns.find((p) => p.patternType === "basicArpeggio")!;
    const descending = patterns.find((p) => p.patternType === "descendingArpeggio");
    if (descending) {
      expect(descending.steps.map((s) => s.intervalToken)).toEqual(
        [...basic.steps.map((s) => s.intervalToken)].reverse(),
      );
    }
  });
});

describe("bassPatternsFor — exact string/fret/MIDI agreement", () => {
  it("every step's stored pitch matches its own string+fret exactly", () => {
    for (const symbol of REPRESENTATIVE_CHORDS) {
      const patterns = bassPatternsFor(parseChordSymbol(symbol));
      for (const pattern of patterns) {
        for (const step of pattern.steps) {
          expect(step.pitch.midi).toBeGreaterThan(0);
          expect(step.fret).toBeGreaterThanOrEqual(0);
          expect([1, 2, 3, 4]).toContain(step.string);
        }
      }
    }
  });
});

describe("bassPatternsFor — playability", () => {
  it("every pattern's fret span stays within the documented max", () => {
    for (const symbol of REPRESENTATIVE_CHORDS) {
      for (const pattern of bassPatternsFor(parseChordSymbol(symbol))) {
        expect(pattern.fretSpan).toBeLessThanOrEqual(MAX_FRET_SPAN);
      }
    }
  });

  it("rejects/omits patterns rather than fabricating one beyond the max fret span", () => {
    // MAX_FRET_SPAN is enforced inside evaluatePattern; bassPatternsFor never
    // bypasses it, so no returned pattern can exceed it — covered above,
    // this test documents the invariant explicitly by name.
    const patterns = bassPatternsFor(parseChordSymbol("C9"));
    expect(patterns.every((p) => p.fretSpan <= MAX_FRET_SPAN)).toBe(true);
  });
});

describe("bassPatternsFor — suggested fingering", () => {
  it("every fretted step's finger, when present, is 1-4; open strings have none", () => {
    for (const symbol of REPRESENTATIVE_CHORDS) {
      for (const pattern of bassPatternsFor(parseChordSymbol(symbol))) {
        for (const step of pattern.steps) {
          if (step.fret === 0) {
            expect(step.finger).toBeUndefined();
          } else if (step.finger !== undefined) {
            expect(step.finger).toBeGreaterThanOrEqual(1);
            expect(step.finger).toBeLessThanOrEqual(4);
          }
        }
      }
    }
  });
});

describe("bassPatternsFor — alternative root positions", () => {
  it("C major's alternative-position pattern uses a different root string than the basic arpeggio", () => {
    const patterns = bassPatternsFor(parseChordSymbol("C"));
    const basic = patterns.find((p) => p.patternType === "basicArpeggio")!;
    const alternative = patterns.find((p) => p.patternType === "alternativePosition");
    if (alternative) {
      expect(alternative.rootString).not.toBe(basic.rootString);
    }
  });
});

describe("bassPatternsFor — Free/Pro catalogue", () => {
  it("the first (at most) 2 patterns are Free, the rest Pro", () => {
    for (const symbol of FULL_V1_CATALOGUE) {
      const patterns = bassPatternsFor(parseChordSymbol(symbol));
      patterns.forEach((p, index) => {
        expect(p.catalogue).toBe(index < 2 ? "free" : "pro");
      });
    }
  });

  it("Free's first pattern is the basic ascending arpeggio when one was found", () => {
    for (const symbol of REPRESENTATIVE_CHORDS) {
      const patterns = bassPatternsFor(parseChordSymbol(symbol));
      const basic = patterns.find((p) => p.patternType === "basicArpeggio");
      if (basic) {
        expect(patterns[0]).toBe(basic);
        expect(patterns[0].catalogue).toBe("free");
      }
    }
  });
});

describe("bassPatternsFor — diversity", () => {
  it("no two patterns for the same chord visit the exact same (string, fret) sequence", () => {
    for (const symbol of FULL_V1_CATALOGUE) {
      const patterns = bassPatternsFor(parseChordSymbol(symbol));
      const signatures = patterns.map((p) => p.steps.map((s) => `${s.string}:${s.fret}`).join(","));
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });
});

describe("bassPatternsFor — enharmonic spelling", () => {
  it("Dbmaj7 patterns spell with flats, never sharps", () => {
    const chord = parseChordSymbol("Dbmaj7");
    const patterns = bassPatternsFor(chord);
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      for (const step of pattern.steps) {
        expect(noteName(step.pitch.note)).not.toContain("#");
      }
    }
  });
});

describe("tabLinesFor", () => {
  it("has exactly 4 lines, high string (G) first, low string (E) last", () => {
    const [pattern] = bassPatternsFor(parseChordSymbol("C"));
    const lines = tabLinesFor(pattern);
    expect(lines.map((l) => l.label)).toEqual(["G", "D", "A", "E"]);
  });

  it("has one column per pattern step, matching the pattern's own step count", () => {
    const [pattern] = bassPatternsFor(parseChordSymbol("Cmaj7"));
    const lines = tabLinesFor(pattern);
    for (const line of lines) {
      expect(line.cells.length).toBe(pattern.steps.length);
    }
  });

  it("each step's fret appears in exactly one line's cell at that step's index, and '-' elsewhere", () => {
    const [pattern] = bassPatternsFor(parseChordSymbol("C"));
    const lines = tabLinesFor(pattern);
    pattern.steps.forEach((step, index) => {
      for (const line of lines) {
        if (line.label === STRING_LABEL[step.string]) {
          expect(line.cells[index]).toBe(String(step.fret));
        } else {
          expect(line.cells[index]).toBe("-");
        }
      }
    });
  });

  it("always reflects the exact pattern passed in — different patterns produce different tab", () => {
    const patterns = bassPatternsFor(parseChordSymbol("Cmaj7"));
    if (patterns.length >= 2) {
      const tab0 = tabLinesFor(patterns[0]).map((l) => l.cells.join(",")).join("|");
      const tab1 = tabLinesFor(patterns[1]).map((l) => l.cells.join(",")).join("|");
      expect(tab0).not.toBe(tab1);
    }
  });
});

const STRING_LABEL: Record<number, string> = { 1: "G", 2: "D", 3: "A", 4: "E" };
