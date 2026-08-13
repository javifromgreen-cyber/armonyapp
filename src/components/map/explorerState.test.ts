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
  it("defaults to the key's tonic triad as a single-step navigation history", () => {
    const state = initialExplorerState(cMajor);
    expect(endpointSymbol(state)).toBe("C");
    expect(state.navPath.steps).toHaveLength(1);
  });

  it("accepts an explicit starting chord (e.g. Cmaj7, the product-spec worked example)", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    expect(endpointSymbol(state)).toBe("Cmaj7");
  });
});

describe("ADVANCE — a single navigation click commits directly (Phase R3.1 §5/§10)", () => {
  it("advancing to a valid destination appends it to the navigation history", () => {
    const state = initialExplorerState(cMajor);
    const advanced = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });

    expect(advanced.navPath.steps.map((s) => chordSymbol(s.chord))).toEqual(["C", "Am"]);
    expect(endpointSymbol(advanced)).toBe("Am");
  });

  it("no separate preview step is required — one ADVANCE is the whole action", () => {
    const state = initialExplorerState(cMajor);
    const advanced = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("F") });
    expect(endpointSymbol(advanced)).toBe("F");
  });

  it("advancing to the current endpoint itself is a no-op", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("Cmaj7"));
    const advanced = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Cmaj7") });
    expect(advanced.navPath).toBe(state.navPath);
  });

  it("old destinations from the previous endpoint are never retained — only the chosen chord persists (Phase R3.1 §4)", () => {
    let state = initialExplorerState(cMajor); // C
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Dm") });
    expect(state.navPath.steps.map((s) => chordSymbol(s.chord))).toEqual(["C", "Am", "Dm"]);
  });
});

describe("BACK / RESET (Phase R3.1 §10/§11/§12)", () => {
  it("BACK steps back one move in the navigation history", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Dm") });

    const back = explorerReducer(state, { type: "BACK" });
    expect(endpointSymbol(back)).toBe("Am");
  });

  it("BACK at the starting chord is a no-op", () => {
    const state = initialExplorerState(cMajor);
    const back = explorerReducer(state, { type: "BACK" });
    expect(back.navPath).toBe(state.navPath);
  });

  it("RESET returns to a fresh single-step history at the context's tonic", () => {
    let state = initialExplorerState(cMajor);
    state = explorerReducer(state, { type: "ADVANCE", chord: parseChordSymbol("Am") });
    const reset = explorerReducer(state, { type: "RESET" });
    expect(reset.navPath.steps).toHaveLength(1);
    expect(endpointSymbol(reset)).toBe("C");
  });
});

describe("SET_CONTEXT resets to the new key's tonic", () => {
  it("switching from C major to A minor resets navigation history", () => {
    const state = initialExplorerState(cMajor, parseChordSymbol("G7"));
    const next = explorerReducer(state, { type: "SET_CONTEXT", context: aMinor });
    expect(next.context).toBe(aMinor);
    expect(endpointSymbol(next)).toBe("Am");
    expect(next.navPath.steps).toHaveLength(1);
  });
});
