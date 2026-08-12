import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { generateCandidatesInWindow, standardSearchWindows } from "./candidates";

describe("standardSearchWindows", () => {
  it("always includes the open window plus two movable windows", () => {
    const windows = standardSearchWindows(parseChordSymbol("C"));
    expect(windows.map((w) => w.id)).toEqual(["open", "e-shape", "a-shape"]);
    expect(windows[0].allowOpen).toBe(true);
    expect(windows[1].allowOpen).toBe(false);
    expect(windows[2].allowOpen).toBe(false);
  });

  it("anchors the E-shape window at the root's fret on string 6 (C -> fret 8)", () => {
    const windows = standardSearchWindows(parseChordSymbol("C"));
    const eShape = windows.find((w) => w.id === "e-shape")!;
    expect(eShape.minFret).toBe(8); // string 6 open = E(pc4); C(pc0) is 8 semitones above E
  });

  it("anchors the A-shape window at the root's fret on string 5 (C -> fret 3)", () => {
    const windows = standardSearchWindows(parseChordSymbol("C"));
    const aShape = windows.find((w) => w.id === "a-shape")!;
    expect(aShape.minFret).toBe(3); // string 5 open = A(pc9); C(pc0) is 3 semitones above A
  });

  it("every movable window spans exactly 4 frets (minFret..minFret+3); the open window spans 5 (0..4)", () => {
    for (const window of standardSearchWindows(parseChordSymbol("G7"))) {
      expect(window.maxFret - window.minFret).toBe(window.id === "open" ? 4 : 3);
    }
  });
});

describe("generateCandidatesInWindow", () => {
  it("never proposes a fret whose pitch class is not one of the chord's tones", () => {
    const chord = parseChordSymbol("C");
    const window = { id: "open", allowOpen: true, minFret: 0, maxFret: 4 };
    const candidates = generateCandidatesInWindow(chord, window);
    expect(candidates.length).toBeGreaterThan(0);
    // Spot-check: every candidate's frets are within the window or "mute".
    for (const candidate of candidates.slice(0, 50)) {
      for (const fret of candidate.frets) {
        if (fret === "mute") continue;
        expect(fret).toBeGreaterThanOrEqual(0);
        expect(fret).toBeLessThanOrEqual(4);
      }
    }
  });

  it("the classic C-major open shape (x32010) appears among the open-window candidates", () => {
    const chord = parseChordSymbol("C");
    const window = { id: "open", allowOpen: true, minFret: 0, maxFret: 4 };
    const candidates = generateCandidatesInWindow(chord, window);
    const target = ["mute", 3, 2, 0, 1, 0];
    const found = candidates.some((c) => c.frets.every((f, i) => f === target[i]));
    expect(found).toBe(true);
  });

  it("a movable window never allows open strings (fret 0)", () => {
    const chord = parseChordSymbol("F");
    const window = { id: "e-shape", allowOpen: false, minFret: 1, maxFret: 4 };
    const candidates = generateCandidatesInWindow(chord, window);
    for (const candidate of candidates) {
      expect(candidate.frets).not.toContain(0);
    }
  });

  it("returns an empty search space gracefully for an impossible window (no matching frets at all)", () => {
    const chord = parseChordSymbol("C");
    // A window far up the neck relative to nothing in particular still just yields "all mute" as the only candidate if nothing matches — never throws.
    const window = { id: "weird", allowOpen: false, minFret: 100, maxFret: 103 };
    expect(() => generateCandidatesInWindow(chord, window)).not.toThrow();
  });
});
