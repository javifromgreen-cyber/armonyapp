import { describe, expect, it } from "vitest";
import { chordSymbol, parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { currentEndpoint } from "@/domain/navigation";
import { explorerReducer, initialExplorerState, panelChord } from "./explorerState";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

function endpointSymbol(state: ReturnType<typeof initialExplorerState>): string {
  return chordSymbol(currentEndpoint(state.navPath));
}

describe("initialExplorerState", () => {
  it("defaults to the key's tonic triad as a single-step path, no preview", () => {
    const state = initialExplorerState(cMajor);
    expect(endpointSymbol(state)).toBe("C");
    expect(state.navPath.steps).toHaveLength(1);
    expect(state.previewChord).toBeNull();
    expect(chordSymbol(panelChord(state))).toBe("C");
  });

  it("accepts an explicit starting chord (e.g. Cmaj7, the product-spec worked example)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    expect(endpointSymbol(state)).toBe("Cmaj7");
  });
});

describe("PREVIEW — inspect without advancing (Phase R3 §12)", () => {
  it("sets previewChord; the path itself is untouched", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    const next = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });

    expect(chordSymbol(next.previewChord!)).toBe("Am");
    expect(endpointSymbol(next)).toBe("Cmaj7"); // path unchanged — preview never advances
    expect(chordSymbol(panelChord(next))).toBe("Am");
  });

  it("previewing the current endpoint itself is a no-op preview (nothing to preview beyond itself)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("C"));
    const next = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("C") });
    expect(next.previewChord).toBeNull();
  });

  it("CLEAR_PREVIEW returns the panel to showing the endpoint", () => {
    const state = initialExplorerState(cMajor);
    const previewed = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("G") });
    const cleared = explorerReducer(previewed, { type: "CLEAR_PREVIEW" });
    expect(cleared.previewChord).toBeNull();
    expect(chordSymbol(panelChord(cleared))).toBe(endpointSymbol(cleared));
  });
});

describe("ADVANCE — click moves the path forward directly (Phase R3 §10/§40)", () => {
  it("advancing to a previewed candidate appends it to the path and clears the preview", () => {
    const state = initialExplorerState(cMajor);
    const previewed = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("Am") });
    const advanced = explorerReducer(previewed, { type: "ADVANCE", chord: parseChordSymbol("Am") });

    expect(advanced.navPath.steps.map((s) => chordSymbol(s.chord))).toEqual(["C", "Am"]);
    expect(endpointSymbol(advanced)).toBe("Am");
    expect(advanced.previewChord).toBeNull();
  });

  it("advancing without a prior preview still advances (no second click required)", () => {
    const state = initialExplorerState(cMajor);
    const advanced = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("F") });
    expect(endpointSymbol(advanced)).toBe("F");
  });

  it("advancing to the current endpoint itself is a no-op on the path (just clears any preview)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    const advanced = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Cmaj7") });
    expect(advanced.navPath).toBe(state.navPath);
  });

  it("old sibling options collapse automatically — the path only ever remembers the chosen chord (Phase R3 §15)", () => {
    let state = initialExplorerState(cMajor); // C
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Dm") });
    expect(state.navPath.steps.map((s) => chordSymbol(s.chord))).toEqual(["C", "Am", "Dm"]);
  });
});

describe("BACK / JUMP_TO / RESET (Phase R3 §28/§29/§42)", () => {
  it("BACK steps back one move and clears any preview", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Dm") });
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("G7") });

    const back = explorerReducer(state, { type: "BACK" });
    expect(endpointSymbol(back)).toBe("Am");
    expect(back.previewChord).toBeNull();
  });

  it("JUMP_TO truncates the path to an earlier breadcrumb", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Dm") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("G7") });

    const jumped = explorerReducer(state, { type: "JUMP_TO", index: 0 });
    expect(endpointSymbol(jumped)).toBe("C");
  });

  it("RESET returns to a fresh single-step path at the context's tonic", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    const reset = explorerReducer(state, { type: "RESET" });
    expect(reset.navPath.steps).toHaveLength(1);
    expect(endpointSymbol(reset)).toBe("C");
  });
});

describe("SET_CONTEXT resets to the new key's tonic", () => {
  it("switching from C major to A minor resets the path and clears any preview", () => {
    let state = initialExplorerState(cMajor, parseChordSymbol("G7"));
    state = explorerReducer(state, { type: "PREVIEW", chord: parseChordSymbol("C") });

    const next = explorerReducer(state, { type: "SET_CONTEXT", context: aMinor });
    expect(next.context).toBe(aMinor);
    expect(endpointSymbol(next)).toBe("Am");
    expect(next.navPath.steps).toHaveLength(1);
    expect(next.previewChord).toBeNull();
  });
});
