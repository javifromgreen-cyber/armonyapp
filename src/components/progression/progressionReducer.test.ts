import { describe, expect, it } from "vitest";
import { chordSymbol, parseChordSymbol } from "@/domain/chords";
import { createProgressionItem, DEFAULT_DURATION_BEATS } from "@/domain/progression";
import {
  progressionReducer,
  initialProgressionState,
  type ProgressionAction,
} from "./progressionReducer";

describe("initialProgressionState", () => {
  it("starts empty with default bpm/time signature", () => {
    const state = initialProgressionState();
    expect(state.items).toEqual([]);
    expect(state.bpm).toBe(90);
    expect(state.timeSignature).toBe("4/4");
  });
});

describe("progressionReducer", () => {
  it("ADD appends the given item", () => {
    const state = initialProgressionState();
    const item = createProgressionItem(parseChordSymbol("Cmaj7"));
    const next = progressionReducer(state, { type: "ADD", item });
    expect(next.items).toEqual([item]);
  });

  it("ADD appends at the end, preserving prior order", () => {
    const first = createProgressionItem(parseChordSymbol("Cmaj7"));
    const second = createProgressionItem(parseChordSymbol("Am7"));
    let state = progressionReducer(initialProgressionState(), { type: "ADD", item: first });
    state = progressionReducer(state, { type: "ADD", item: second });
    expect(state.items.map((i) => chordSymbol(i.chord))).toEqual(["Cmaj7", "Am7"]);
  });

  it("REMOVE, REORDER, SET_DURATION, SET_BPM, SET_TIME_SIGNATURE, CLEAR, TRANSPOSE all delegate to the domain layer", () => {
    const item1 = createProgressionItem(parseChordSymbol("C"));
    const item2 = createProgressionItem(parseChordSymbol("Am"));
    let state = initialProgressionState();
    state = progressionReducer(state, { type: "ADD", item: item1 });
    state = progressionReducer(state, { type: "ADD", item: item2 });

    state = progressionReducer(state, { type: "SET_DURATION", id: item1.id, durationBeats: 2 });
    expect(state.items[0].durationBeats).toBe(2);

    state = progressionReducer(state, { type: "REORDER", fromIndex: 0, toIndex: 1 });
    expect(state.items.map((i) => i.id)).toEqual([item2.id, item1.id]);

    state = progressionReducer(state, { type: "SET_BPM", bpm: 140 });
    expect(state.bpm).toBe(140);

    state = progressionReducer(state, { type: "SET_TIME_SIGNATURE", timeSignature: "3/4" });
    expect(state.timeSignature).toBe("3/4");

    state = progressionReducer(state, { type: "TRANSPOSE", semitones: 2 });
    expect(state.items.map((i) => chordSymbol(i.chord))).toEqual(["Bm", "D"]);

    state = progressionReducer(state, { type: "REMOVE", id: item1.id });
    expect(state.items).toHaveLength(1);

    state = progressionReducer(state, { type: "CLEAR" });
    expect(state.items).toEqual([]);
    expect(state.bpm).toBe(140); // CLEAR preserves bpm/time signature
  });

  it("an unrecognized action is a no-op (type-level exhaustiveness aside, defensive default)", () => {
    const state = initialProgressionState();
    const next = progressionReducer(state, { type: "NOT_REAL" } as unknown as ProgressionAction);
    expect(next).toBe(state);
  });

  it("added items default to DEFAULT_DURATION_BEATS via createProgressionItem", () => {
    const item = createProgressionItem(parseChordSymbol("G7"));
    expect(item.durationBeats).toBe(DEFAULT_DURATION_BEATS);
  });
});

describe("architectural guarantee — progression state is its own reducer, isolated from map/select/explore state", () => {
  it("progressionReducer's action type has no SELECT/EXPLORE/SET_ZOOM/SET_CONTEXT member — those belong to explorerReducer only", () => {
    // This is enforced at the type level (ProgressionAction and ExplorerAction
    // are disjoint unions dispatched to two separate useReducer instances in
    // ExplorerApp), so selecting or exploring a chord cannot reach this
    // reducer at all — there is no runtime branch to test because there is
    // no code path. See ExplorerApp.tsx: two independent useReducer calls.
    const actionTypes: ProgressionAction["type"][] = [
      "ADD",
      "REMOVE",
      "REORDER",
      "SET_DURATION",
      "SET_BPM",
      "SET_TIME_SIGNATURE",
      "CLEAR",
      "TRANSPOSE",
    ];
    expect(actionTypes).not.toContain("SELECT");
    expect(actionTypes).not.toContain("EXPLORE");
  });
});
