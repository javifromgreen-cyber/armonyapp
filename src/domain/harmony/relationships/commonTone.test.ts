import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol, chordNotes } from "../../chords/chord";
import { noteToPitchClass, parseNoteName } from "../../notes/note";
import type { Key } from "../../keys/key";
import { commonToneRelationships } from "./commonTone";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function sharedTones(aSymbol: string, bSymbol: string): number {
  const a = new Set(chordNotes(parseChordSymbol(aSymbol)).map(noteToPitchClass));
  const b = chordNotes(parseChordSymbol(bSymbol)).map(noteToPitchClass);
  return b.filter((pc) => a.has(pc)).length;
}

describe("commonToneRelationships — C major from C", () => {
  it("Cm (the parallel minor) is the only qualifying remote triad", () => {
    const targets = commonToneRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).toEqual(["Cm"]);
  });

  it("shares at least 2 tones with the source", () => {
    expect(sharedTones("C", "Cm")).toBe(2);
  });

  it("every edge is Zoom 4", () => {
    for (const edge of commonToneRelationships(parseChordSymbol("C"), cMajor)) {
      expect(edge.harmonicDepth).toBe(4);
    }
  });

  it("never targets the source's own chord", () => {
    const targets = commonToneRelationships(parseChordSymbol("C"), cMajor).map((e) =>
      chordSymbol(e.target),
    );
    expect(targets).not.toContain("C");
  });
});
