import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordNotes } from "@/domain/chords";
import { noteToPitchClass, noteName } from "@/domain/notes";
import { guitarVoicingsFor } from "./voicing";
import { tabLinesFor } from "./tab";
import type { GuitarStringSound } from "./types";

const CHORD_LIST = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "F",
  "Am",
  "Em",
  "Dm",
  "Bm",
  "Cmaj7",
  "G7",
  "Am7",
  "Bm7b5",
  "F#dim7",
  "Dbmaj7",
  "C9",
  "Cm9",
];

function soundingPitchClasses(strings: GuitarStringSound[]): Set<number> {
  return new Set(strings.filter((s) => s.pitch).map((s) => noteToPitchClass(s.pitch!.note)));
}

describe("guitarVoicingsFor — every V1 catalogue chord produces at least one playable voicing", () => {
  it.each(CHORD_LIST)("%s has at least 1 voicing", (symbol) => {
    const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
    expect(voicings.length).toBeGreaterThan(0);
  });
});

describe("guitarVoicingsFor — every returned voicing only sounds real chord tones", () => {
  it.each(CHORD_LIST)("%s", (symbol) => {
    const chord = parseChordSymbol(symbol);
    const expectedPitchClasses = new Set(chordNotes(chord).map(noteToPitchClass));
    for (const voicing of guitarVoicingsFor(chord)) {
      for (const pc of soundingPitchClasses(voicing.strings)) {
        expect(expectedPitchClasses.has(pc)).toBe(true);
      }
    }
  });
});

describe("guitarVoicingsFor — physical shape invariants hold for every voicing of every chord", () => {
  it.each(CHORD_LIST)("%s", (symbol) => {
    const chord = parseChordSymbol(symbol);
    for (const voicing of guitarVoicingsFor(chord)) {
      expect(voicing.strings).toHaveLength(6);
      expect(voicing.fretSpan).toBeLessThanOrEqual(4);

      const soundingCount = voicing.strings.filter((s) => s.state.status !== "muted").length;
      expect(soundingCount).toBeGreaterThanOrEqual(3);

      // Independent finger count invariant, recomputed from the voicing itself.
      const frettedNotFingeredByBarre = voicing.strings.filter(
        (s) => s.state.status === "fretted" && s.state.finger !== voicing.barre?.finger,
      );
      const barredCount = voicing.barre ? 1 : 0;
      expect(barredCount + frettedNotFingeredByBarre.length).toBeLessThanOrEqual(4);

      // Every fretted note has a finger number (1-4), and every open/muted string has none.
      for (const s of voicing.strings) {
        if (s.state.status === "fretted") {
          expect(s.state.finger).toBeGreaterThanOrEqual(1);
          expect(s.state.finger).toBeLessThanOrEqual(4);
        } else {
          expect((s.state as { finger?: number }).finger).toBeUndefined();
        }
      }
    }
  });
});

describe("guitarVoicingsFor — chord-tone completeness (Phase 8 §12)", () => {
  it("triads always sound root, 3rd, and 5th", () => {
    for (const symbol of ["C", "Am", "F", "Bm"]) {
      const chord = parseChordSymbol(symbol);
      const tones = new Set(chordNotes(chord).map(noteToPitchClass));
      for (const voicing of guitarVoicingsFor(chord)) {
        const sounding = soundingPitchClasses(voicing.strings);
        expect([...tones].every((pc) => sounding.has(pc))).toBe(true);
      }
    }
  });

  it("7th chords always sound root, 3rd, and 7th (5th may be omitted)", () => {
    for (const symbol of ["Cmaj7", "G7", "Am7", "Bm7b5", "F#dim7"]) {
      const chord = parseChordSymbol(symbol);
      const [root, third, , seventh] = chordNotes(chord).map(noteToPitchClass);
      for (const voicing of guitarVoicingsFor(chord)) {
        const sounding = soundingPitchClasses(voicing.strings);
        expect(sounding.has(root)).toBe(true);
        expect(sounding.has(third)).toBe(true);
        expect(sounding.has(seventh)).toBe(true);
      }
    }
  });

  it("9th-family chords always sound root, 3rd, 7th, and 9th (5th may be omitted)", () => {
    for (const symbol of ["C9", "Cm9"]) {
      const chord = parseChordSymbol(symbol);
      const [root, third, , seventh, ninth] = chordNotes(chord).map(noteToPitchClass);
      for (const voicing of guitarVoicingsFor(chord)) {
        const sounding = soundingPitchClasses(voicing.strings);
        expect(sounding.has(root)).toBe(true);
        expect(sounding.has(third)).toBe(true);
        expect(sounding.has(seventh)).toBe(true);
        expect(sounding.has(ninth)).toBe(true);
      }
    }
  });
});

describe("guitarVoicingsFor — Free/Pro catalogue", () => {
  it("the first (at most) 2 voicings are Free, the rest Pro", () => {
    for (const symbol of CHORD_LIST) {
      const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
      voicings.forEach((v, index) => {
        expect(v.catalogue).toBe(index < 2 ? "free" : "pro");
      });
    }
  });
});

describe("guitarVoicingsFor — curated shapes take priority when available", () => {
  it("C major's first voicing is the curated open shape (x32010)", () => {
    const [first] = guitarVoicingsFor(parseChordSymbol("C"));
    expect(first.origin).toBe("curated");
    const frets = first.strings.map((s) =>
      s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
    );
    expect(frets).toEqual(["x", 3, 2, 0, 1, 0]);
  });

  it("F major (no curated shape) still returns a realistic barre-based voicing", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("F"));
    const [first] = voicings;
    expect(first.origin).toBe("generated");
    expect(first.fretSpan).toBeLessThanOrEqual(4);

    // Regression guard (Phase 8 §35 live-browser verification): ranking
    // weights that under-penalize skipped/muted interior strings can rank a
    // sparse, unrecognizable fragment (e.g. only the A string open plus the
    // top two strings fretted, with the D and G strings muted in between)
    // above a real F shape. The top voicing must actually sound all three
    // triad tones and must not trap a muted string between two sounding
    // ones.
    const sounding = first.strings.filter((s) => s.pitch);
    expect(sounding.length).toBeGreaterThanOrEqual(3);
    const soundingPitchClasses = new Set(sounding.map((s) => noteToPitchClass(s.pitch!.note)));
    expect(soundingPitchClasses.size).toBe(3); // root, 3rd, 5th — the full triad

    const soundingIndexes = first.strings
      .map((s, index) => (s.pitch ? index : -1))
      .filter((index) => index !== -1);
    const [lowIndex, highIndex] = [Math.min(...soundingIndexes), Math.max(...soundingIndexes)];
    const interiorMuted = first.strings
      .slice(lowIndex, highIndex + 1)
      .filter((s) => s.state.status === "muted").length;
    expect(interiorMuted).toBe(0);
  });
});

describe("guitarVoicingsFor — inversion / bass-note handling (Phase 8 §13)", () => {
  it("the curated C-major shape has the root in the bass (inversion 0)", () => {
    const [first] = guitarVoicingsFor(parseChordSymbol("C"));
    expect(first.inversion).toBe(0);
    expect(first.rootPresent).toBe(true);
  });

  it("inversion is derived from the actual lowest sounding pitch, not the chord symbol", () => {
    for (const symbol of ["Cmaj7", "G7", "Am"]) {
      const chord = parseChordSymbol(symbol);
      const tones = chordNotes(chord).map(noteToPitchClass);
      for (const voicing of guitarVoicingsFor(chord)) {
        const sounding = voicing.strings.filter((s) => s.pitch);
        const bass = sounding.reduce((lowest, s) =>
          s.pitch!.midi < lowest.pitch!.midi ? s : lowest,
        );
        const expectedInversion = tones.indexOf(noteToPitchClass(bass.pitch!.note));
        expect(voicing.inversion).toBe(expectedInversion);
      }
    }
  });
});

describe("guitarVoicingsFor — enharmonic spelling (Phase 8 §29)", () => {
  it("Dbmaj7 voicings spell with flats, never sharps", () => {
    const chord = parseChordSymbol("Dbmaj7");
    const voicings = guitarVoicingsFor(chord);
    expect(voicings.length).toBeGreaterThan(0);
    for (const voicing of voicings) {
      for (const s of voicing.strings) {
        if (s.pitch) expect(noteName(s.pitch.note)).not.toContain("#");
      }
    }
  });
});

describe("guitarVoicingsFor — deduplication", () => {
  it("no two voicings for the same chord share the exact same fret pattern", () => {
    for (const symbol of CHORD_LIST) {
      const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
      const signatures = voicings.map((v) =>
        v.strings
          .map((s) => (s.state.status === "muted" ? "x" : s.state.status === "open" ? "0" : s.state.fret))
          .join(","),
      );
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });
});

describe("tabLinesFor", () => {
  it("orders lines high string (e) first, low string (E) last", () => {
    const [voicing] = guitarVoicingsFor(parseChordSymbol("C"));
    const lines = tabLinesFor(voicing);
    expect(lines.map((l) => l.label)).toEqual(["e", "B", "G", "D", "A", "E"]);
  });

  it("matches the curated C-major shape exactly: e-0 B-1 G-0 D-2 A-3 E-x", () => {
    const [voicing] = guitarVoicingsFor(parseChordSymbol("C"));
    const lines = tabLinesFor(voicing);
    expect(lines.map((l) => l.symbol)).toEqual(["0", "1", "0", "2", "3", "x"]);
  });

  it("always reflects the exact voicing passed in — different voicings produce different tab", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("Cmaj7"));
    if (voicings.length >= 2) {
      const tab0 = tabLinesFor(voicings[0]).map((l) => l.symbol).join(",");
      const tab1 = tabLinesFor(voicings[1]).map((l) => l.symbol).join(",");
      expect(tab0).not.toBe(tab1);
    }
  });
});
