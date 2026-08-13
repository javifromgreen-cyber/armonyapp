import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import {
  startPath,
  currentEndpoint,
  advancePath,
  goBack,
  jumpToStep,
  resetPath,
  currentMoveDepth,
  pathDepth,
} from "./path";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function symbols(path: ReturnType<typeof startPath>): string[] {
  return path.steps.map((step) => chordSymbol(step.chord));
}

describe("startPath / currentEndpoint", () => {
  it("a fresh path has exactly one step, with no incoming move", () => {
    const path = startPath(parseChordSymbol("C"));
    expect(symbols(path)).toEqual(["C"]);
    expect(path.steps[0].move).toBeUndefined();
    expect(chordSymbol(currentEndpoint(path))).toBe("C");
  });
});

describe("advancePath — Phase R3 §10/§40 direct navigation", () => {
  it("C -> Am -> Dm -> G7 builds up the path one step at a time, endpoint always last", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    expect(symbols(path)).toEqual(["C", "Am"]);
    expect(chordSymbol(currentEndpoint(path))).toBe("Am");

    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    expect(symbols(path)).toEqual(["C", "Am", "Dm"]);

    path = advancePath(path, cMajor, parseChordSymbol("G7"));
    expect(symbols(path)).toEqual(["C", "Am", "Dm", "G7"]);
  });

  it("records the actual relationship taken as the step's move", () => {
    const path = advancePath(startPath(parseChordSymbol("C")), cMajor, parseChordSymbol("Am"));
    const lastStep = path.steps[path.steps.length - 1];
    expect(lastStep.move).toBeDefined();
    expect(chordSymbol(lastStep.move!.target)).toBe("Am");
  });

  it("advancing never mutates the previous path object (pure)", () => {
    const original = startPath(parseChordSymbol("C"));
    const advanced = advancePath(original, cMajor, parseChordSymbol("Am"));
    expect(symbols(original)).toEqual(["C"]);
    expect(symbols(advanced)).toEqual(["C", "Am"]);
  });
});

describe("goBack — Phase R3 §28/§42", () => {
  it("C -> Am -> Dm, Back returns to C -> Am with Am as the endpoint", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));

    const back = goBack(path);
    expect(symbols(back)).toEqual(["C", "Am"]);
    expect(chordSymbol(currentEndpoint(back))).toBe("Am");
  });

  it("Back at the starting chord is a no-op — nowhere earlier to go", () => {
    const path = startPath(parseChordSymbol("C"));
    expect(goBack(path)).toBe(path);
  });
});

describe("jumpToStep — generalized multi-step Back", () => {
  it("jumping to step 0 truncates all the way back to the starting chord", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    path = advancePath(path, cMajor, parseChordSymbol("G7"));

    expect(symbols(jumpToStep(path, 0))).toEqual(["C"]);
    expect(symbols(jumpToStep(path, 2))).toEqual(["C", "Am", "Dm"]);
  });

  it("an out-of-range index is a no-op", () => {
    const path = startPath(parseChordSymbol("C"));
    expect(jumpToStep(path, 5)).toBe(path);
    expect(jumpToStep(path, -1)).toBe(path);
  });
});

describe("resetPath — Phase R3 §29", () => {
  it("returns to a fresh single-step path at the given chord", () => {
    const reset = resetPath(parseChordSymbol("C"));
    expect(symbols(reset)).toEqual(["C"]);
  });
});

describe("currentMoveDepth / pathDepth — Phase R3 §7/§8/§38", () => {
  it("currentMoveDepth is undefined at the starting chord (no move yet)", () => {
    expect(currentMoveDepth(startPath(parseChordSymbol("C")))).toBeUndefined();
  });

  it("currentMoveDepth reflects the most recent move's depth", () => {
    const path = advancePath(startPath(parseChordSymbol("C")), cMajor, parseChordSymbol("Am"));
    expect(currentMoveDepth(path)).toBe(path.steps[1].move!.harmonicDepth);
  });

  it("pathDepth is undefined until at least one move has been taken", () => {
    expect(pathDepth(startPath(parseChordSymbol("C")))).toBeUndefined();
  });

  it("pathDepth is the maximum move depth seen anywhere along the path (1 -> 1 -> 3 yields 3)", () => {
    // C -> Am -> Dm are both diatonic (Zoom 1). Dm -> F#m is a Zoom-3
    // chromatic-mediant colour move — pathDepth must pick that up.
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    expect(pathDepth(path)).toBe(1);

    path = advancePath(path, cMajor, parseChordSymbol("F#m"));
    const lastMoveDepth = path.steps[path.steps.length - 1].move!.harmonicDepth;
    expect(lastMoveDepth).toBe(3);
    expect(pathDepth(path)).toBe(3);
  });

  it("pathDepth recalculates correctly after Back steps past the deepest move", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    path = advancePath(path, cMajor, parseChordSymbol("F#m")); // a deeper (chromatic mediant) move
    const deepDepth = pathDepth(path)!;
    expect(deepDepth).toBeGreaterThan(1);

    const back = goBack(path); // undoes the F#m move
    expect(pathDepth(back)).toBe(1); // C -> Am -> Dm are both plain diatonic Zoom-1 moves
  });
});
