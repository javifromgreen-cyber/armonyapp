import { describe, expect, it } from "vitest";
import { parseNoteName, noteName } from "../notes/note";
import { chordSymbol, chordNotes } from "../chords/chord";
import type { Key } from "../keys/key";
import { leadingTone, functionalDominant, functionalLeadingToneDiminished } from "./functionalMinor";

const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };
const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

describe("leadingTone", () => {
  it("A minor's leading tone is G# (the natural-minor subtonic G, raised)", () => {
    expect(noteName(leadingTone(aMinor))).toBe("G#");
  });

  it("C major's leading tone is B (already scale degree 7, unaltered)", () => {
    expect(noteName(leadingTone(cMajor))).toBe("B");
  });
});

describe("functionalDominant — the E7 -> Am case from the product brief", () => {
  it("A minor's functional dominant is E7 = E G# B D, not the natural (weak) Em", () => {
    const e7 = functionalDominant(aMinor, "dominant7");
    expect(chordSymbol(e7)).toBe("E7");
    expect(chordNotes(e7).map(noteName)).toEqual(["E", "G#", "B", "D"]);
  });

  it("C major's functional dominant is the ordinary diatonic G7 (no alteration needed)", () => {
    const g7 = functionalDominant(cMajor, "dominant7");
    expect(chordSymbol(g7)).toBe("G7");
  });
});

describe("functionalLeadingToneDiminished", () => {
  it("A minor's leading-tone diminished 7th is G#dim7 = G# B D F", () => {
    const chord = functionalLeadingToneDiminished(aMinor, "diminished7");
    expect(chordSymbol(chord)).toBe("G#dim7");
    expect(chordNotes(chord).map(noteName)).toEqual(["G#", "B", "D", "F"]);
  });
});
