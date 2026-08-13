import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { startPath, advancePath, goBack, resetPath } from "../navigation/path";
import { progressionFromPath } from "./fromNavigationPath";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function symbolsOf(path: ReturnType<typeof startPath>): string[] {
  return progressionFromPath(path).items.map((item) => chordSymbol(item.chord));
}

describe("progressionFromPath — Phase R3.3 §22/§33/§53-57, revised R3.4 (no BPM/time signature)", () => {
  it("§53 the starting chord automatically IS progression item 1, with no manual Add", () => {
    const path = startPath(parseChordSymbol("C"));
    expect(symbolsOf(path)).toEqual(["C"]);
  });

  it("§54 confirming a sequence of moves automatically grows the progression, with no manual Add", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    path = advancePath(path, cMajor, parseChordSymbol("G7"));
    path = advancePath(path, cMajor, parseChordSymbol("C"));
    expect(symbolsOf(path)).toEqual(["C", "Am", "Dm", "G7", "C"]);
  });

  it("§55 Back removes exactly the last confirmed item, symmetric with navigation", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    path = advancePath(path, cMajor, parseChordSymbol("G7"));
    expect(symbolsOf(path)).toEqual(["C", "Am", "Dm", "G7"]);

    path = goBack(path);
    expect(symbolsOf(path)).toEqual(["C", "Am", "Dm"]);
    path = goBack(path);
    expect(symbolsOf(path)).toEqual(["C", "Am"]);
    path = goBack(path);
    expect(symbolsOf(path)).toEqual(["C"]);
  });

  it("§28/§55 Back never removes the starting/root chord — repeated Back is a no-op there", () => {
    const path = startPath(parseChordSymbol("C"));
    const afterBack = goBack(path);
    expect(symbolsOf(afterBack)).toEqual(["C"]);
    expect(symbolsOf(goBack(afterBack))).toEqual(["C"]);
  });

  it("§29-30/§56 changing the root/context resets the progression to just the new root — no stale items", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    expect(symbolsOf(path)).toEqual(["C", "Am", "Dm"]);

    const resetToNewRoot = resetPath(parseChordSymbol("D"));
    expect(symbolsOf(resetToNewRoot)).toEqual(["D"]);
  });

  it("§34 confirming never duplicates the confirmed item, however many times the derivation is recomputed", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    // Recomputing from the SAME path (simulating extra re-renders) must
    // never grow the list — items are a pure projection, not an
    // imperative append.
    expect(symbolsOf(path)).toEqual(["C", "Am"]);
    expect(symbolsOf(path)).toEqual(["C", "Am"]);
    expect(symbolsOf(path)).toEqual(["C", "Am"]);
  });

  it("Phase R3.4: items carry no BPM/time-signature/duration — a plain {id, chord} list", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    const progression = progressionFromPath(path);
    expect(Object.keys(progression)).toEqual(["items"]);
    progression.items.forEach((item) => {
      expect(Object.keys(item).sort()).toEqual(["chord", "id"]);
    });
  });

  it("item ids stay stable by position across recomputation (React key / playingItemId stability, §67)", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    const first = progressionFromPath(path);
    const second = progressionFromPath(path);
    expect(second.items.map((i) => i.id)).toEqual(first.items.map((i) => i.id));
  });
});
