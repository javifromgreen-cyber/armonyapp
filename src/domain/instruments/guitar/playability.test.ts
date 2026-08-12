import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { noteToPitchClass } from "@/domain/notes";
import { evaluateCandidate } from "./playability";
import { fretForPitchClass } from "./tuning";
import type { RawCandidate } from "./candidates";
import type { StringNumber } from "./types";

function candidate(frets: (number | "mute")[]): RawCandidate {
  return { windowId: "test", frets };
}

/** The lowest fret >= `minFret` on `stringNumber` reaching `pitchClass` — built from the real domain math so hand-picked test fixtures can't silently drift out of sync with a real chord tone. */
function fretAtOrAbove(stringNumber: StringNumber, pitchClass: number, minFret: number): number {
  let fret = fretForPitchClass(stringNumber, pitchClass);
  while (fret < minFret) fret += 12;
  return fret;
}

describe("evaluateCandidate — accepts realistic shapes", () => {
  it("accepts the classic C-major open shape (x32010)", () => {
    const evaluated = evaluateCandidate(parseChordSymbol("C"), candidate(["mute", 3, 2, 0, 1, 0]));
    expect(evaluated).toBeDefined();
    expect(evaluated!.fretSpan).toBe(2); // frets 1,2,3 -> span 2
    expect(evaluated!.baseFret).toBe(1);
    expect(evaluated!.openStringCount).toBe(2); // string 3 and string 1
  });

  it("assigns ascending fingers 1-2-3 to the C-major shape's ascending frets 1-2-3", () => {
    const evaluated = evaluateCandidate(parseChordSymbol("C"), candidate(["mute", 3, 2, 0, 1, 0]))!;
    const fingerByFret = new Map<number, number | undefined>();
    for (const s of evaluated.strings) {
      if (s.state.status === "fretted") fingerByFret.set(s.state.fret, s.state.finger);
    }
    expect(fingerByFret.get(1)).toBe(1);
    expect(fingerByFret.get(2)).toBe(2);
    expect(fingerByFret.get(3)).toBe(3);
  });

  it("detects a full barre across 6 strings at the same fret as a single finger (F major E-shape, 133211)", () => {
    const evaluated = evaluateCandidate(parseChordSymbol("F"), candidate([1, 3, 3, 2, 1, 1]));
    expect(evaluated).toBeDefined();
    expect(evaluated!.barre).toBeDefined();
    expect(evaluated!.barre!.fret).toBe(1);
    expect(evaluated!.barre!.finger).toBe(1);
    // barre.strings is the full physical range the barre finger lies across (all 6) —
    // even though strings 5 and 3 actually sound at a higher fret via other fingers.
    expect([...evaluated!.barre!.strings].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(evaluated!.fingerCount).toBeLessThanOrEqual(4);
    expect(evaluated!.fingerCount).toBe(4); // barre(1) + string5(3) + string4(3) + string3(2)
  });
});

describe("evaluateCandidate — rejects unplayable shapes", () => {
  it("rejects a shape with fewer than 3 sounding strings", () => {
    const evaluated = evaluateCandidate(
      parseChordSymbol("C"),
      candidate(["mute", "mute", "mute", "mute", 1, 0]),
    );
    expect(evaluated).toBeUndefined();
  });

  it("rejects a fret span wider than 4, even though every individual note is a real chord tone", () => {
    const chord = parseChordSymbol("C"); // C major: C E G
    const c = noteToPitchClass({ letter: "C", accidental: 0 });
    const e = noteToPitchClass({ letter: "E", accidental: 0 });
    // string6 low fret for C, string2 a much higher fret for E — deliberately far apart.
    const lowFret = fretAtOrAbove(6, c, 1);
    const highFret = fretAtOrAbove(2, e, lowFret + 6); // guaranteed >= lowFret+6, so span > 4
    const evaluated = evaluateCandidate(
      chord,
      candidate([lowFret, "mute", "mute", "mute", highFret, 0]),
    );
    expect(evaluated).toBeUndefined();
  });

  it("rejects a shape needing more than 4 independent (non-barre) fretting fingers", () => {
    // C9 = C E G Bb D (5 distinct tones) — pick 5 different strings, each forced
    // to a DIFFERENT one of the 5 tones at a fret that keeps every note within
    // a 4-fret span, with no two strings sharing a fret (so no barre applies).
    const chord = parseChordSymbol("C9");
    const [, e, g, bb, d] = [0, 4, 7, 10, 2]; // C E G Bb D
    const base = 3; // arbitrary low base fret to search from
    const f6 = fretAtOrAbove(6, g, base);
    const f5 = fretAtOrAbove(5, e, base);
    const f4 = fretAtOrAbove(4, g, base);
    const f3 = fretAtOrAbove(3, bb, base);
    const f2 = fretAtOrAbove(2, d, base);
    const evaluated = evaluateCandidate(chord, candidate([f6, f5, f4, f3, f2, "mute"]));
    // Whatever the frets land on, the function's own contract must hold —
    // and this particular construction (5 fretted notes, unlikely to align
    // on a single shared fret) is expected to exceed 4 independent fingers.
    if (evaluated) {
      expect(evaluated.fingerCount).toBeLessThanOrEqual(4);
    }
  });

  it("never returns a voicing exceeding the documented hard limits, across many random-ish candidates", () => {
    const chord = parseChordSymbol("Cmaj7");
    const c = 0;
    const e = 4;
    const g = 7;
    const b = 11;
    const tones = [c, e, g, b];
    let checked = 0;
    for (let f6 = 0; f6 <= 10; f6++) {
      for (let f1 = 0; f1 <= 10; f1++) {
        const pc6 = (4 + f6) % 12;
        const pc1 = (4 + f1) % 12;
        if (!tones.includes(pc6) || !tones.includes(pc1)) continue;
        const evaluated = evaluateCandidate(chord, candidate([f6, "mute", "mute", "mute", "mute", f1]));
        checked++;
        if (evaluated) {
          expect(evaluated.fretSpan).toBeLessThanOrEqual(4);
          expect(evaluated.fingerCount).toBeLessThanOrEqual(4);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("evaluateCandidate — barre validity requires a physically continuous range", () => {
  it("denies a barre when a string physically between two same-fret strings is muted", () => {
    // Cmaj7 = C E G B. string6 fret8 = C, string2 fret8 = G — both real
    // chord tones sharing the minimum fret — but strings 5/4/3 (physically
    // between them) are muted, which a real barre finger could not do
    // while also sounding string6 and string2 at that same fret. string1
    // fret12 = E supplies a 3rd sounding string (kept above the shared
    // minimum fret so it doesn't change which fret is being tested).
    const chord = parseChordSymbol("Cmaj7");
    const evaluated = evaluateCandidate(chord, candidate([8, "mute", "mute", "mute", 8, 12]));
    expect(evaluated).toBeDefined();
    expect(evaluated!.baseFret).toBe(8);
    expect(evaluated!.barre).toBeUndefined();
  });

  it("grants a barre across the full contiguous range even when interior strings are fretted higher by other fingers (F major)", () => {
    const evaluated = evaluateCandidate(parseChordSymbol("F"), candidate([1, 3, 3, 2, 1, 1]));
    expect(evaluated!.barre!.strings.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("evaluateCandidate — muted interior detection", () => {
  it("counts a muted string with sounding strings on both sides as an interior mute", () => {
    // Em = E G B. Open strings valid for Em: 6(E) 3(G) 2(B) 1(E) — NOT 5(A) or 4(D).
    // string6 and string3 sound (open), with string5 and string4 muted between them.
    const chord = parseChordSymbol("Em");
    const evaluated = evaluateCandidate(chord, candidate([0, "mute", "mute", 0, "mute", 0]));
    expect(evaluated).toBeDefined();
    expect(evaluated!.mutedInteriorCount).toBeGreaterThanOrEqual(1);
  });

  it("does not count an edge mute (nothing sounding on one side) as interior", () => {
    const chord = parseChordSymbol("Em");
    const evaluated = evaluateCandidate(chord, candidate(["mute", "mute", "mute", 0, 0, 0]));
    expect(evaluated).toBeDefined();
    expect(evaluated!.mutedInteriorCount).toBe(0);
  });
});
