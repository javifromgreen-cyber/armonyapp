import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { functionDisplayInfo } from "./functionDisplay";

const C_MAJOR: Key = { tonic: { letter: "C", accidental: 0 }, mode: "major" };

describe("functionDisplayInfo", () => {
  it("labels the true tonic (I) as tonic, not tonic function", () => {
    expect(functionDisplayInfo(parseChordSymbol("C"), C_MAJOR)).toEqual({
      romanNumeral: "I",
      labelKey: "tonic",
    });
  });

  it("labels vi as tonic function, distinct from the true tonic", () => {
    expect(functionDisplayInfo(parseChordSymbol("Am"), C_MAJOR)).toEqual({
      romanNumeral: "vi",
      labelKey: "tonicFunction",
    });
  });

  it("labels iii as tonic function", () => {
    expect(functionDisplayInfo(parseChordSymbol("Em"), C_MAJOR)).toEqual({
      romanNumeral: "iii",
      labelKey: "tonicFunction",
    });
  });

  it("labels ii as predominant with no tonic-function-style qualifier", () => {
    expect(functionDisplayInfo(parseChordSymbol("Dm"), C_MAJOR)).toEqual({
      romanNumeral: "ii",
      labelKey: "predominant",
    });
  });

  it("labels IV as predominant", () => {
    expect(functionDisplayInfo(parseChordSymbol("F"), C_MAJOR)).toEqual({
      romanNumeral: "IV",
      labelKey: "predominant",
    });
  });

  it("labels V as dominant", () => {
    expect(functionDisplayInfo(parseChordSymbol("G"), C_MAJOR)).toEqual({
      romanNumeral: "V",
      labelKey: "dominant",
    });
  });

  it("labels vii as dominant (diminished numeral)", () => {
    expect(functionDisplayInfo(parseChordSymbol("Bdim"), C_MAJOR)).toEqual({
      romanNumeral: "vii°",
      labelKey: "dominant",
    });
  });

  it("does not show a roman numeral for a secondary dominant sharing the tonic's root (C7 in C major)", () => {
    const info = functionDisplayInfo(parseChordSymbol("C7"), C_MAJOR);
    expect(info).toEqual({ romanNumeral: undefined, labelKey: "secondaryDominant" });
  });

  it("does not show a roman numeral for a borrowed chord", () => {
    const info = functionDisplayInfo(parseChordSymbol("Fm"), C_MAJOR);
    expect(info).toEqual({ romanNumeral: undefined, labelKey: "borrowed" });
  });

  it("returns undefined for a chord with no diatonic root and no specific role", () => {
    expect(functionDisplayInfo(parseChordSymbol("F#"), C_MAJOR)).toBeUndefined();
  });
});
