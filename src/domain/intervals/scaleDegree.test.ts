import { describe, expect, it } from "vitest";
import { noteName } from "../notes/note";
import {
  parseScaleDegreeToken,
  noteAtScaleDegree,
  ScaleDegreeParseError,
} from "./scaleDegree";

describe("parseScaleDegreeToken", () => {
  it("parses unaltered, flat, sharp, and double-altered tokens", () => {
    expect(parseScaleDegreeToken("1")).toEqual({ degree: 1, alteration: 0 });
    expect(parseScaleDegreeToken("b3")).toEqual({ degree: 3, alteration: -1 });
    expect(parseScaleDegreeToken("#5")).toEqual({ degree: 5, alteration: 1 });
    expect(parseScaleDegreeToken("bb7")).toEqual({ degree: 7, alteration: -2 });
    expect(parseScaleDegreeToken("9")).toEqual({ degree: 9, alteration: 0 });
    expect(parseScaleDegreeToken("13")).toEqual({ degree: 13, alteration: 0 });
  });

  it("rejects malformed tokens", () => {
    expect(() => parseScaleDegreeToken("x3")).toThrow(ScaleDegreeParseError);
    expect(() => parseScaleDegreeToken("#")).toThrow(ScaleDegreeParseError);
  });
});

describe("noteAtScaleDegree", () => {
  const C = { letter: "C" as const, accidental: 0 };
  const A = { letter: "A" as const, accidental: 0 };

  it("builds a major third and perfect fifth above C", () => {
    expect(noteName(noteAtScaleDegree(C, { degree: 3, alteration: 0 }))).toBe("E");
    expect(noteName(noteAtScaleDegree(C, { degree: 5, alteration: 0 }))).toBe("G");
  });

  it("builds a minor third (b3) above A as C, not B#", () => {
    expect(noteName(noteAtScaleDegree(A, { degree: 3, alteration: -1 }))).toBe("C");
  });

  it("builds a flat seventh (b7) above G as F, not E#", () => {
    const G = { letter: "G" as const, accidental: 0 };
    expect(noteName(noteAtScaleDegree(G, { degree: 7, alteration: -1 }))).toBe("F");
  });

  it("builds a natural 9th above C as D (one octave-adjusted letter above the root)", () => {
    expect(noteName(noteAtScaleDegree(C, { degree: 9, alteration: 0 }))).toBe("D");
  });

  it("builds a diminished (double-flat) seventh above C as Bbb, not A", () => {
    expect(noteName(noteAtScaleDegree(C, { degree: 7, alteration: -2 }))).toBe("Bbb");
  });
});
