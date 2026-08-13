import { describe, expect, it } from "vitest";
import { chordSymbol, parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { currentEndpoint } from "@/domain/navigation";
import { explorerReducer, initialExplorerState } from "./explorerState";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

function endpointSymbol(state: ReturnType<typeof initialExplorerState>): string {
  return chordSymbol(currentEndpoint(state.navPath));
}

describe("initialExplorerState", () => {
  it("defaults to the key's tonic triad as a single-step confirmed history, no preview", () => {
    const state = initialExplorerState(cMajor);
    expect(endpointSymbol(state)).toBe("C");
    expect(state.navPath.steps).toHaveLength(1);
    expect(state.previewChord).toBeNull();
  });

  it("accepts an explicit starting chord (e.g. Cmaj7, the product-spec worked example)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    expect(endpointSymbol(state)).toBe("Cmaj7");
  });
});

describe("PREVIEW-state test (Phase R3.2 §45)", () => {
  it("first activation sets preview WITHOUT touching confirmed history", () => {
    const state = initialExplorerState(cMajor); // C
    const previewed = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });

    expect(endpointSymbol(previewed)).toBe("C"); // current remains C
    expect(symbols(previewed.navPath)).toEqual(["C"]); // confirmed history remains [C]
    expect(chordSymbol(previewed.previewChord!)).toBe("Am");
  });

  it("activating a second candidate switches the preview and never touches confirmed history", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("F") });

    expect(chordSymbol(state.previewChord!)).toBe("F"); // Am lost preview state, F has it
    expect(endpointSymbol(state)).toBe("C");
    expect(symbols(state.navPath)).toEqual(["C"]);
  });

  it("previewing the current endpoint itself is a no-op (it isn't a candidate)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("C"));
    const next = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("C") });
    expect(next.previewChord).toBeNull();
  });

  it("CLEAR_PREVIEW returns to no active preview", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("G") });
    const cleared = explorerReducer(state, { type: "CLEAR_PREVIEW" });
    expect(cleared.previewChord).toBeNull();
  });
});

describe("CONFIRMATION test (Phase R3.2 §46)", () => {
  it("activating the SAME already-previewed candidate again confirms it: history updates, current changes, preview clears", () => {
    let state = initialExplorerState(cMajor); // current C
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("F") });
    const confirmed = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("F") });

    expect(symbols(confirmed.navPath)).toEqual(["C", "F"]);
    expect(endpointSymbol(confirmed)).toBe("F");
    expect(confirmed.previewChord).toBeNull();
  });

  it("CONFIRM is a defensive no-op when the chord isn't the currently-active preview", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("F") });
    const result = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("G") });
    expect(result).toBe(state); // untouched
  });

  it("CONFIRM without any active preview is a no-op", () => {
    const state = initialExplorerState(cMajor);
    const result = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("F") });
    expect(result).toBe(state);
  });
});

describe("longer cumulative sequence (Phase R3.2 §47)", () => {
  it("C -> preview/confirm F -> preview/confirm Am -> preview Dm -> switch to E7 -> confirm E7", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("F") });
    state = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("F") });
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("Am") });
    expect(symbols(state.navPath)).toEqual(["C", "F", "Am"]);

    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Dm") });
    expect(symbols(state.navPath)).toEqual(["C", "F", "Am"]); // still just previewing
    expect(chordSymbol(state.previewChord!)).toBe("Dm");

    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("E7") });
    expect(chordSymbol(state.previewChord!)).toBe("E7"); // switched, Dm never confirmed

    state = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("E7") });
    expect(symbols(state.navPath)).toEqual(["C", "F", "Am", "E7"]);
    expect(state.previewChord).toBeNull();
  });
});

describe("BACK test (Phase R3.2 §48)", () => {
  it("Back clears any preview, removes the latest confirmed step, and returns to the previous current chord", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("F") });
    state = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("F") });
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "CONFIRM", chord: parseChordSymbol("Am") });
    // now preview Dm without confirming
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Dm") });

    const back = explorerReducer(state, { type: "BACK" });
    expect(back.previewChord).toBeNull(); // Dm's preview is discarded, never sounds again
    expect(symbols(back.navPath)).toEqual(["C", "F"]);
    expect(endpointSymbol(back)).toBe("F");
  });

  it("Back at the starting chord is a no-op", () => {
    const state = initialExplorerState(cMajor);
    const back = explorerReducer(state, { type: "BACK" });
    expect(back.navPath).toBe(state.navPath);
  });
});

describe("current-chord replay does not touch state (Phase R3.2 §17/§50)", () => {
  it("CLEAR_PREVIEW is the only state change replay triggers — history and endpoint stay put", () => {
    let state = initialExplorerState(cMajor, parseChordSymbol("Am"));
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Dm") });
    const afterReplay = explorerReducer(state, { type: "CLEAR_PREVIEW" });
    expect(symbols(afterReplay.navPath)).toEqual(["Am"]);
    expect(afterReplay.previewChord).toBeNull();
  });
});

describe("RESET", () => {
  it("returns to a fresh single-step history at the context's tonic, clearing any preview", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });
    const reset = explorerReducer(state, { type: "RESET" });
    expect(reset.navPath.steps).toHaveLength(1);
    expect(endpointSymbol(reset)).toBe("C");
    expect(reset.previewChord).toBeNull();
  });
});

describe("SET_CONTEXT resets to the new key's tonic", () => {
  it("switching from C major to A minor resets history and clears any preview", () => {
    let state = initialExplorerState(cMajor, parseChordSymbol("G7"));
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("C") });

    const next = explorerReducer(state, { type: "SET_CONTEXT", context: aMinor });
    expect(next.context).toBe(aMinor);
    expect(endpointSymbol(next)).toBe("Am");
    expect(next.navPath.steps).toHaveLength(1);
    expect(next.previewChord).toBeNull();
  });
});

function symbols(navPath: ReturnType<typeof initialExplorerState>["navPath"]): string[] {
  return navPath.steps.map((step) => chordSymbol(step.chord));
}
