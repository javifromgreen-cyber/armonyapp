import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol, chordNotes } from "../../chords/chord";
import { noteToPitchClass } from "../../notes/note";
import { parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { chromaticMediantRelationships } from "./chromaticMediant";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

function sharedTones(aSymbol: string, bSymbol: string): number {
  const a = new Set(chordNotes(parseChordSymbol(aSymbol)).map(noteToPitchClass));
  const b = chordNotes(parseChordSymbol(bSymbol)).map(noteToPitchClass);
  return b.filter((pc) => a.has(pc)).length;
}

describe("chromaticMediantRelationships — C major from C", () => {
  it("E major and A major (Ab/Eb excluded — already borrowed bVI/bIII)", () => {
    const targets = chromaticMediantRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["A", "E"].sort());
  });

  it("every target shares exactly one tone with the source", () => {
    for (const edge of chromaticMediantRelationships(parseChordSymbol("C"), cMajor)) {
      expect(sharedTones("C", chordSymbol(edge.target))).toBe(1);
    }
  });

  it("every edge is Zoom 3", () => {
    for (const edge of chromaticMediantRelationships(parseChordSymbol("C"), cMajor)) {
      expect(edge.harmonicDepth).toBe(3);
    }
  });
});

describe("chromaticMediantRelationships — A minor from Am", () => {
  it("Cm, C#m, F#m, Fm", () => {
    const targets = chromaticMediantRelationships(parseChordSymbol("Am"), aMinor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets.sort()).toEqual(["C#m", "Cm", "F#m", "Fm"].sort());
  });
});
