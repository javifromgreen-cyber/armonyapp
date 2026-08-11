import { describe, expect, it } from "vitest";
import { chordSymbol, parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { explorerReducer, initialExplorerState } from "./explorerState";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

describe("initialExplorerState", () => {
  it("defaults to the key's tonic triad, zoom 1", () => {
    const state = initialExplorerState(cMajor);
    expect(chordSymbol(state.exploredChord)).toBe("C");
    expect(chordSymbol(state.selectedChord)).toBe("C");
    expect(state.zoom).toBe(1);
  });

  it("accepts an explicit starting chord (e.g. Cmaj7, the product-spec worked example)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    expect(chordSymbol(state.exploredChord)).toBe("Cmaj7");
    expect(chordSymbol(state.selectedChord)).toBe("Cmaj7");
  });
});

describe("explorerReducer — SELECT never mutates the explored/map-centering state", () => {
  it("SELECT changes only selectedChord", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    const next = explorerReducer(state, { type: "SELECT", chord: parseChordSymbol("Am") });

    expect(chordSymbol(next.selectedChord)).toBe("Am");
    expect(chordSymbol(next.exploredChord)).toBe("Cmaj7"); // unchanged — map does not recenter
    expect(next.context).toBe(state.context);
    expect(next.zoom).toBe(state.zoom);
  });

  it("selecting the same chord repeatedly is idempotent", () => {
    const state = initialExplorerState(cMajor);
    const once = explorerReducer(state, { type: "SELECT", chord: parseChordSymbol("G") });
    const twice = explorerReducer(once, { type: "SELECT", chord: parseChordSymbol("G") });
    expect(twice).toEqual(once);
  });
});

describe("explorerReducer — EXPLORE recenters the map", () => {
  it("EXPLORE updates both exploredChord and selectedChord together", () => {
    const state = initialExplorerState(cMajor);
    const next = explorerReducer(state, { type: "EXPLORE", chord: parseChordSymbol("Am") });
    expect(chordSymbol(next.exploredChord)).toBe("Am");
    expect(chordSymbol(next.selectedChord)).toBe("Am");
  });

  it("exploring a chord that was merely selected replaces the prior selection", () => {
    const state = initialExplorerState(cMajor);
    const selected = explorerReducer(state, { type: "SELECT", chord: parseChordSymbol("Am") });
    const explored = explorerReducer(selected, { type: "EXPLORE", chord: parseChordSymbol("Am") });
    expect(chordSymbol(explored.exploredChord)).toBe("Am");
    expect(chordSymbol(explored.selectedChord)).toBe("Am");
  });
});

describe("explorerReducer — SET_ZOOM", () => {
  it("changes only zoom", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    const next = explorerReducer(state, { type: "SET_ZOOM", zoom: 3 });
    expect(next.zoom).toBe(3);
    expect(chordSymbol(next.exploredChord)).toBe("Cmaj7");
    expect(chordSymbol(next.selectedChord)).toBe("Cmaj7");
  });
});

describe("explorerReducer — SET_CONTEXT resets to the new key's tonic", () => {
  it("switching from C major to A minor resets explored/selected chord and zoom", () => {
    const state = explorerReducer(
      initialExplorerState(cMajor, parseChordSymbol("G7")),
      { type: "SET_ZOOM", zoom: 4 },
    );
    const next = explorerReducer(state, { type: "SET_CONTEXT", context: aMinor });

    expect(next.context).toBe(aMinor);
    expect(chordSymbol(next.exploredChord)).toBe("Am");
    expect(chordSymbol(next.selectedChord)).toBe("Am");
    expect(next.zoom).toBe(1);
  });
});
