import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordNotes } from "@/domain/chords";
import { noteName, noteToPitchClass } from "@/domain/notes";
import { pianoVoicingsFor } from "./voicing";

function midisOf(chord: ReturnType<typeof parseChordSymbol>, voicingId: string): number[] {
  const voicing = pianoVoicingsFor(chord).find((v) => v.id === voicingId)!;
  return voicing.pitches.map((p) => p.midi);
}

function namesOf(chord: ReturnType<typeof parseChordSymbol>, voicingId: string): string[] {
  const voicing = pianoVoicingsFor(chord).find((v) => v.id === voicingId)!;
  return voicing.pitches.map((p) => noteName(p.note));
}

describe("pianoVoicingsFor — triads (C major)", () => {
  const c = parseChordSymbol("C");

  it("generates exactly 3 voicings: root, 1st, 2nd inversion", () => {
    const voicings = pianoVoicingsFor(c);
    expect(voicings.map((v) => v.id)).toEqual(["root", "inversion1", "inversion2"]);
    expect(voicings.map((v) => v.inversion)).toEqual([0, 1, 2]);
  });

  it("root position is C E G", () => {
    expect(namesOf(c, "root")).toEqual(["C", "E", "G"]);
  });

  it("1st inversion is E G C (bass = the 3rd)", () => {
    expect(namesOf(c, "inversion1")).toEqual(["E", "G", "C"]);
  });

  it("2nd inversion is G C E (bass = the 5th)", () => {
    expect(namesOf(c, "inversion2")).toEqual(["G", "C", "E"]);
  });

  it("all 3 triad inversions are Free", () => {
    const voicings = pianoVoicingsFor(c);
    expect(voicings.every((v) => v.catalogue === "free")).toBe(true);
  });

  it("root position sits in a comfortable central register (C4 E4 G4)", () => {
    expect(midisOf(c, "root")).toEqual([60, 64, 67]);
  });

  it("suggests 1-3-5 right-hand fingering for close-position triads", () => {
    for (const voicing of pianoVoicingsFor(c)) {
      expect(voicing.fingering).toEqual({ hand: "right", fingers: [1, 3, 5] });
    }
  });
});

describe("pianoVoicingsFor — Am (minor triad)", () => {
  const am = parseChordSymbol("Am");

  it("root position is A C E", () => {
    expect(namesOf(am, "root")).toEqual(["A", "C", "E"]);
  });

  it("bass note of each voicing matches the corresponding formula degree (inversion identity)", () => {
    const formula = chordNotes(am).map((n) => noteToPitchClass(n));
    const voicings = pianoVoicingsFor(am);
    voicings.forEach((voicing, index) => {
      expect(noteToPitchClass(voicing.pitches[0].note)).toBe(formula[index]);
    });
  });
});

describe("pianoVoicingsFor — Cmaj7 (product-spec worked example)", () => {
  const cmaj7 = parseChordSymbol("Cmaj7");

  it("generates exactly 4 voicings: root, 1st, 2nd, 3rd inversion", () => {
    const voicings = pianoVoicingsFor(cmaj7);
    expect(voicings.map((v) => v.id)).toEqual(["root", "inversion1", "inversion2", "inversion3"]);
  });

  it("root position is exactly C4 E4 G4 B4", () => {
    expect(namesOf(cmaj7, "root")).toEqual(["C", "E", "G", "B"]);
    expect(midisOf(cmaj7, "root")).toEqual([60, 64, 67, 71]);
  });

  it("1st inversion is exactly E4 G4 B4 C5", () => {
    expect(namesOf(cmaj7, "inversion1")).toEqual(["E", "G", "B", "C"]);
    expect(midisOf(cmaj7, "inversion1")).toEqual([64, 67, 71, 72]);
  });

  it("2nd inversion is G B C E, ascending", () => {
    expect(namesOf(cmaj7, "inversion2")).toEqual(["G", "B", "C", "E"]);
    const midis = midisOf(cmaj7, "inversion2");
    for (let i = 1; i < midis.length; i++) expect(midis[i]).toBeGreaterThan(midis[i - 1]);
  });

  it("3rd inversion is B C E G, ascending", () => {
    expect(namesOf(cmaj7, "inversion3")).toEqual(["B", "C", "E", "G"]);
    const midis = midisOf(cmaj7, "inversion3");
    for (let i = 1; i < midis.length; i++) expect(midis[i]).toBeGreaterThan(midis[i - 1]);
  });

  it("root and 1st inversion are Free; 2nd and 3rd are Pro", () => {
    const voicings = pianoVoicingsFor(cmaj7);
    expect(voicings.map((v) => v.catalogue)).toEqual(["free", "free", "pro", "pro"]);
  });

  it("suggests 1-2-3-5 right-hand fingering for close-position 7th chords", () => {
    for (const voicing of pianoVoicingsFor(cmaj7)) {
      expect(voicing.fingering).toEqual({ hand: "right", fingers: [1, 2, 3, 5] });
    }
  });
});

describe("pianoVoicingsFor — G7 (dominant 7th)", () => {
  const g7 = parseChordSymbol("G7");

  it("root position is G B D F", () => {
    expect(namesOf(g7, "root")).toEqual(["G", "B", "D", "F"]);
  });

  it("stays in a sensible central register (no huge gaps)", () => {
    const midis = midisOf(g7, "root");
    expect(midis[midis.length - 1] - midis[0]).toBeLessThanOrEqual(12);
  });
});

describe("pianoVoicingsFor — Bm7b5 (half-diminished)", () => {
  const bm7b5 = parseChordSymbol("Bm7b5");

  it("root position is B D F A", () => {
    expect(namesOf(bm7b5, "root")).toEqual(["B", "D", "F", "A"]);
  });

  it("even with a high root letter (B), the voicing stays centrally registered, not pushed unreasonably high", () => {
    const midis = midisOf(bm7b5, "root");
    expect(midis[0]).toBeGreaterThanOrEqual(59); // B3 or higher
    expect(midis[midis.length - 1]).toBeLessThanOrEqual(84); // C6 or lower
  });
});

describe("pianoVoicingsFor — Dbmaj7 (flat-key enharmonic spelling)", () => {
  const dbmaj7 = parseChordSymbol("Dbmaj7");

  it("spells with flats (Db F Ab C), never sharps, preserving harmonic-context spelling", () => {
    const names = namesOf(dbmaj7, "root");
    expect(names).toEqual(["Db", "F", "Ab", "C"]);
    expect(names.some((n) => n.includes("#"))).toBe(false);
  });

  it("remains sensibly positioned around the central register", () => {
    const midis = midisOf(dbmaj7, "root");
    expect(midis[0]).toBeGreaterThanOrEqual(55);
    expect(midis[midis.length - 1]).toBeLessThanOrEqual(79);
  });
});

describe("pianoVoicingsFor — F#dim7 (register boundary, double-flat spelling)", () => {
  const fSharpDim7 = parseChordSymbol("F#dim7");

  it("generates a fully ascending root-position voicing without error", () => {
    const midis = midisOf(fSharpDim7, "root");
    for (let i = 1; i < midis.length; i++) expect(midis[i]).toBeGreaterThan(midis[i - 1]);
  });

  it("preserves the diminished-7th's context-driven spelling exactly as chordNotes() produces it", () => {
    expect(namesOf(fSharpDim7, "root")).toEqual(chordNotes(fSharpDim7).map(noteName));
  });
});

describe("pianoVoicingsFor — C9 (5-tone extended chord)", () => {
  const c9 = parseChordSymbol("C9");

  it("generates root, 1st inversion, and a Pro open voicing — not a full rotation cycle", () => {
    const voicings = pianoVoicingsFor(c9);
    expect(voicings.map((v) => v.id)).toEqual(["root", "inversion1", "open"]);
  });

  it("root position stacks all 5 tones ascending without an awkward muddy gap", () => {
    const midis = midisOf(c9, "root");
    for (let i = 1; i < midis.length; i++) expect(midis[i]).toBeGreaterThan(midis[i - 1]);
    expect(midis[midis.length - 1] - midis[0]).toBeLessThanOrEqual(16);
  });

  it("root and 1st inversion are Free; open voicing is Pro", () => {
    const voicings = pianoVoicingsFor(c9);
    expect(voicings.map((v) => v.catalogue)).toEqual(["free", "free", "pro"]);
  });

  it("the open voicing keeps the same pitch classes as root position but raises the top tone an octave", () => {
    const root = pianoVoicingsFor(c9).find((v) => v.id === "root")!;
    const open = pianoVoicingsFor(c9).find((v) => v.id === "open")!;
    expect(open.pitches.slice(0, -1).map((p) => p.midi)).toEqual(
      root.pitches.slice(0, -1).map((p) => p.midi),
    );
    expect(open.pitches[open.pitches.length - 1].midi).toBe(
      root.pitches[root.pitches.length - 1].midi + 12,
    );
  });

  it("omits fingering for the 5-note extended chord and the open voicing (no reliable suggestion)", () => {
    for (const voicing of pianoVoicingsFor(c9)) {
      expect(voicing.fingering).toBeUndefined();
    }
  });
});

describe("pianoVoicingsFor — Cm9 (minor 9th)", () => {
  const cm9 = parseChordSymbol("Cm9");

  it("root position is C Eb G Bb D", () => {
    expect(namesOf(cm9, "root")).toEqual(["C", "Eb", "G", "Bb", "D"]);
  });
});

describe("pianoVoicingsFor — transposition-aware octave handling", () => {
  it("transposing a chord up a semitone shifts every voicing's pitches up a semitone", () => {
    const c = parseChordSymbol("C");
    const csharp = parseChordSymbol("C#");
    const cMidis = midisOf(c, "root");
    const cSharpMidis = midisOf(csharp, "root");
    expect(cSharpMidis).toEqual(cMidis.map((m) => m + 1));
  });
});

describe("pianoVoicingsFor — chord identity is untouched by voicing choice", () => {
  it("every voicing for the same chord shares the same underlying Chord value", () => {
    const cmaj7 = parseChordSymbol("Cmaj7");
    const voicings = pianoVoicingsFor(cmaj7);
    for (const voicing of voicings) {
      expect(voicing.chord).toBe(cmaj7);
    }
  });
});
