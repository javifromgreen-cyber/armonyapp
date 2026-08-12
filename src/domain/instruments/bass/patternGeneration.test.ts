import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { noteToPitchClass } from "@/domain/notes";
import { rootAnchors, buildAscendingSteps, buildRootFifthOctaveSteps, reverseSteps } from "./patternGeneration";
import { bassChordToneTable } from "./chordTones";

describe("rootAnchors", () => {
  it("returns the E-string and A-string root positions, in that order", () => {
    const [eAnchor, aAnchor] = rootAnchors(parseChordSymbol("C"));
    expect(eAnchor.string).toBe(4);
    expect(aAnchor.string).toBe(3);
  });

  it("C major's root lands on fret 8 (E string) and fret 3 (A string)", () => {
    const [eAnchor, aAnchor] = rootAnchors(parseChordSymbol("C"));
    expect(eAnchor.fret).toBe(8);
    expect(aAnchor.fret).toBe(3);
  });

  it("G major's root lands on fret 3 (E string) and fret 10 (A string)", () => {
    const [eAnchor, aAnchor] = rootAnchors(parseChordSymbol("G"));
    expect(eAnchor.fret).toBe(3);
    expect(aAnchor.fret).toBe(10);
  });
});

describe("buildAscendingSteps", () => {
  it("C major (triad): root, 3rd, 5th, then the octave root — 1 3 5 8", () => {
    const chord = parseChordSymbol("C");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps).toBeDefined();
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "1"]);
    expect(steps[0].string).toBe(4);
    expect(steps[0].fret).toBe(8);
  });

  it("Cmaj7 (4-tone): root, 3rd, 5th, 7th — no trailing octave", () => {
    const chord = parseChordSymbol("Cmaj7");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "7"]);
  });

  it("Am (minor triad): 1 b3 5 1 (octave)", () => {
    const chord = parseChordSymbol("Am");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "b3", "5", "1"]);
  });

  it("G7 (dominant 7th): 1 3 5 b7", () => {
    const chord = parseChordSymbol("G7");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "b7"]);
  });

  it("Bm7b5: 1 b3 b5 b7 — correct half-diminished identity preserved", () => {
    const chord = parseChordSymbol("Bm7b5");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "b3", "b5", "b7"]);
  });

  it("Caug: 1 3 #5 — the raised 5th survives into the pattern, not a plain 5th", () => {
    const chord = parseChordSymbol("Caug");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "3", "#5", "1"]);
  });

  it("Csus4: 1 4 5 — sus chords use their own formula, not a fabricated 3rd", () => {
    const chord = parseChordSymbol("Csus4");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "4", "5", "1"]);
  });

  it("C9: 1 3 5 b7 9 — the extension is preserved, not silently dropped", () => {
    const chord = parseChordSymbol("C9");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildAscendingSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "3", "5", "b7", "9"]);
  });

  it("every step's pitch is strictly higher than the previous step's — genuinely ascending", () => {
    for (const symbol of ["C", "Am", "G7", "Cmaj9", "Bdim7"]) {
      const chord = parseChordSymbol(symbol);
      const [eAnchor] = rootAnchors(chord);
      const steps = buildAscendingSteps(chord, eAnchor)!;
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].pitch.midi).toBeGreaterThan(steps[i - 1].pitch.midi);
      }
    }
  });

  it("every step only sounds a real chord tone", () => {
    for (const symbol of ["C", "Am", "G7", "Cmaj9", "Bdim7", "Caug", "Csus2"]) {
      const chord = parseChordSymbol(symbol);
      const tones = new Set(bassChordToneTable(chord).map((t) => t.pitchClass));
      const [eAnchor] = rootAnchors(chord);
      const steps = buildAscendingSteps(chord, eAnchor)!;
      for (const step of steps) {
        expect(tones.has(noteToPitchClass(step.pitch.note))).toBe(true);
      }
    }
  });
});

describe("buildRootFifthOctaveSteps", () => {
  it("C major: root, 5th, octave — exactly 3 steps, 3rd is skipped", () => {
    const chord = parseChordSymbol("C");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildRootFifthOctaveSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "5", "1"]);
  });

  it("Bdim: root, b5, octave — the altered 5th is used, never a plain 5th", () => {
    const chord = parseChordSymbol("Bdim");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildRootFifthOctaveSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "b5", "1"]);
  });

  it("Caug: root, #5, octave", () => {
    const chord = parseChordSymbol("Caug");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildRootFifthOctaveSteps(chord, eAnchor)!;
    expect(steps.map((s) => s.intervalToken)).toEqual(["1", "#5", "1"]);
  });

  it("is strictly ascending", () => {
    const chord = parseChordSymbol("G7");
    const [eAnchor] = rootAnchors(chord);
    const steps = buildRootFifthOctaveSteps(chord, eAnchor)!;
    expect(steps[1].pitch.midi).toBeGreaterThan(steps[0].pitch.midi);
    expect(steps[2].pitch.midi).toBeGreaterThan(steps[1].pitch.midi);
  });
});

describe("reverseSteps", () => {
  it("reverses order without altering the notes themselves", () => {
    const chord = parseChordSymbol("Cmaj7");
    const [eAnchor] = rootAnchors(chord);
    const ascending = buildAscendingSteps(chord, eAnchor)!;
    const descending = reverseSteps(ascending);
    expect(descending.map((s) => s.intervalToken)).toEqual(["7", "5", "3", "1"]);
    expect(descending.map((s) => s.pitch.midi)).toEqual([...ascending.map((s) => s.pitch.midi)].reverse());
    // descending order: each step is lower (or equal) pitch than the previous
    for (let i = 1; i < descending.length; i++) {
      expect(descending[i].pitch.midi).toBeLessThan(descending[i - 1].pitch.midi);
    }
  });
});
