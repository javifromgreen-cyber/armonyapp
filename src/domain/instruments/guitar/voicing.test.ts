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

  it("F major's first voicing is the curated full-barre open shape (133211), root position", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("F"));
    const [first] = voicings;
    expect(first.origin).toBe("curated");
    const frets = first.strings.map((s) =>
      s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
    );
    expect(frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(first.inversion).toBe(0); // root position — F is the bass note
    expect(first.rootPresent).toBe(true);
    expect(first.barre).toEqual({ finger: 1, fret: 1, strings: [6, 5, 4, 3, 2, 1] });
  });

  it("G7's first voicing is the curated classic open shape (320001), root position", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("G7"));
    const [first] = voicings;
    expect(first.origin).toBe("curated");
    const frets = first.strings.map((s) =>
      s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
    );
    expect(frets).toEqual([3, 2, 0, 0, 0, 1]);
  });
});

describe("guitarVoicingsFor — Phase 8.2 canonical/basic voicing correction", () => {
  it("320001 exists in G7's catalogue, has G in the bass, is root position, and is Free", () => {
    const chord = parseChordSymbol("G7");
    const voicings = guitarVoicingsFor(chord);
    const canonical = voicings.find((v) => {
      const frets = v.strings.map((s) =>
        s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
      );
      return frets.join(",") === "3,2,0,0,0,1";
    });
    expect(canonical).toBeDefined();
    expect(canonical!.inversion).toBe(0); // root position
    expect(canonical!.rootPresent).toBe(true);
    expect(canonical!.catalogue).toBe("free");

    // Correct notes: G(root) B(3rd) D(5th) F(b7), G in the bass.
    const soundingNotes = canonical!.strings
      .filter((s) => s.pitch)
      .map((s) => noteToPitchClass(s.pitch!.note));
    const [root, third, fifth, seventh] = chordNotes(chord).map(noteToPitchClass);
    expect(new Set(soundingNotes)).toEqual(new Set([root, third, fifth, seventh]));
    const bass = canonical!.strings
      .filter((s) => s.pitch)
      .reduce((lowest, s) => (s.pitch!.midi < lowest.pitch!.midi ? s : lowest));
    expect(noteToPitchClass(bass.pitch!.note)).toBe(root);
  });

  it("320001 ranks before G7's partial/inverted alternatives", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("G7"));
    const canonicalIndex = voicings.findIndex((v) => {
      const frets = v.strings.map((s) =>
        s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
      );
      return frets.join(",") === "3,2,0,0,0,1";
    });
    expect(canonicalIndex).toBe(0); // curated shapes always rank first
    // Every other returned voicing for G7 is a partial/inverted alternative —
    // confirm the canonical shape isn't merely present but is the very first
    // one a user sees.
    expect(voicings[0].origin).toBe("curated");
  });

  it("previously-curated canonical shapes are unchanged by the Phase 8.2 addition", () => {
    const expected: [string, (number | "x")[]][] = [
      ["C", ["x", 3, 2, 0, 1, 0]],
      ["G", [3, 2, 0, 0, 0, 3]],
      ["D", ["x", "x", 0, 2, 3, 2]],
      ["A", ["x", 0, 2, 2, 2, 0]],
      ["E", [0, 2, 2, 1, 0, 0]],
      ["Am", ["x", 0, 2, 2, 1, 0]],
      ["Em", [0, 2, 2, 0, 0, 0]],
      ["Dm", ["x", "x", 0, 2, 3, 1]],
      ["F", [1, 3, 3, 2, 1, 1]],
      ["Cmaj7", ["x", 3, 2, 0, 0, 0]],
    ];
    for (const [symbol, expectedFrets] of expected) {
      const [first] = guitarVoicingsFor(parseChordSymbol(symbol));
      expect(first.origin).toBe("curated");
      const frets = first.strings.map((s) =>
        s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
      );
      expect(frets).toEqual(expectedFrets);
    }
  });
});

describe("guitarVoicingsFor — Phase 8.1 ranking refinement", () => {
  it("Cmaj7's catalogue includes the standard open x32000 in root position", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("Cmaj7"));
    const x32000 = voicings.find((v) => {
      const frets = v.strings.map((s) =>
        s.state.status === "muted" ? "x" : s.state.status === "open" ? 0 : s.state.fret,
      );
      return frets.join(",") === "x,3,2,0,0,0";
    });
    expect(x32000).toBeDefined();
    expect(x32000!.inversion).toBe(0);
    expect(x32000!.rootPresent).toBe(true);
    // The whole point of Phase 8.1: this common, root-position shape must
    // be genuinely surfaced, not buried past the Free/Pro split's usefulness.
    expect(x32000!.catalogue).toBe("free");
  });

  it("F major's barre metadata, fingering, and TAB are all internally consistent", () => {
    const [first] = guitarVoicingsFor(parseChordSymbol("F"));
    expect(first.barre?.strings.sort((a, b) => b - a)).toEqual([6, 5, 4, 3, 2, 1]);

    // Barre-fretted strings share finger 1; every other fretted string has
    // its own independent finger, never re-using the barre's finger number.
    const barreFret = first.barre!.fret;
    for (const s of first.strings) {
      if (s.state.status !== "fretted") continue;
      if (s.state.fret === barreFret) {
        expect(s.state.finger).toBe(1);
      } else {
        expect(s.state.finger).not.toBe(1);
      }
    }

    const lines = tabLinesFor(first);
    expect(lines.map((l) => l.symbol)).toEqual(["1", "1", "2", "3", "3", "1"]);
  });

  it("root position is preferred over a comparable inversion when candidates are otherwise close", () => {
    // G7's generated catalogue (no curated shape) should surface a root-position
    // voicing at or near the top rather than only ever preferring inversions.
    const voicings = guitarVoicingsFor(parseChordSymbol("G7"));
    const rootPositionIndex = voicings.findIndex((v) => v.inversion === 0);
    expect(rootPositionIndex).toBeGreaterThanOrEqual(0);
    expect(rootPositionIndex).toBeLessThanOrEqual(1); // one of the first two
  });

  it("inversions remain available in the catalogue — root-position preference is a tie-breaker, not exclusion", () => {
    for (const symbol of ["Cmaj7", "G7", "Bm7b5"]) {
      const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
      const inversions = new Set(voicings.map((v) => v.inversion));
      expect(inversions.size).toBeGreaterThan(1);
    }
  });

  it("the diversity pass leaves no two near-duplicate voicings in the same catalogue", () => {
    for (const symbol of CHORD_LIST) {
      const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
      for (let i = 0; i < voicings.length; i++) {
        for (let j = i + 1; j < voicings.length; j++) {
          const a = voicings[i];
          const b = voicings[j];
          if (a.inversion !== b.inversion) continue;
          if (Math.abs(a.baseFret - b.baseFret) > 2) continue;
          let distance = 0;
          for (let k = 0; k < 6; k++) {
            const sa = a.strings[k].state;
            const sb = b.strings[k].state;
            const va = sa.status === "fretted" ? `f${sa.fret}` : sa.status;
            const vb = sb.status === "fretted" ? `f${sb.fret}` : sb.status;
            if (va !== vb) distance++;
          }
          expect(distance).toBeGreaterThan(1);
        }
      }
    }
  });

  it("different fretboard regions survive the diversity pass for a chord with many candidates", () => {
    const voicings = guitarVoicingsFor(parseChordSymbol("Bm7b5"));
    const baseFrets = new Set(voicings.map((v) => v.baseFret));
    expect(baseFrets.size).toBeGreaterThan(1);
  });

  it("Free stays at (at most) 2 voicings, Pro carries the rest of a broader catalogue", () => {
    for (const symbol of ["Cmaj7", "F", "G7", "Bm7b5"]) {
      const voicings = guitarVoicingsFor(parseChordSymbol(symbol));
      const free = voicings.filter((v) => v.catalogue === "free");
      const pro = voicings.filter((v) => v.catalogue === "pro");
      expect(free.length).toBeLessThanOrEqual(2);
      expect(pro.length).toBeGreaterThan(0); // these chords have enough good candidates
    }
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
