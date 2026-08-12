import { describe, expect, it } from "vitest";
import { evaluatePattern, MAX_FRET_SPAN } from "./playability";
import type { BassPatternStep } from "./types";

function step(string: 1 | 2 | 3 | 4, fret: number): BassPatternStep {
  return {
    string,
    fret,
    pitch: { note: { letter: "C", accidental: 0 }, octave: 2, midi: 36 + fret, frequencyHz: 0 },
    intervalToken: "1",
  };
}

describe("evaluatePattern — fret span", () => {
  it("accepts a pattern within the max fret span", () => {
    const evaluated = evaluatePattern([step(4, 3), step(3, 5), step(2, 7)]);
    expect(evaluated).toBeDefined();
    expect(evaluated!.fretSpan).toBe(4);
  });

  it("rejects a pattern whose fret span exceeds the max", () => {
    const evaluated = evaluatePattern([step(4, 1), step(3, 1 + MAX_FRET_SPAN + 1)]);
    expect(evaluated).toBeUndefined();
  });

  it("open strings never inflate the fret span", () => {
    const evaluated = evaluatePattern([step(4, 0), step(3, 3), step(2, 0), step(1, 5)]);
    expect(evaluated).toBeDefined();
    expect(evaluated!.fretSpan).toBe(2); // just the fretted 3..5 range
  });

  it("base fret is the lowest FRETTED fret, ignoring opens", () => {
    const evaluated = evaluatePattern([step(4, 0), step(3, 3), step(2, 5)]);
    expect(evaluated!.baseFret).toBe(3);
  });

  it("an all-open pattern has fret span 0 and base fret 0", () => {
    const evaluated = evaluatePattern([step(4, 0), step(3, 0)]);
    expect(evaluated!.fretSpan).toBe(0);
    expect(evaluated!.baseFret).toBe(0);
  });
});

describe("evaluatePattern — suggested fingering (1-2-4 below fret 5, 1-2-3-4 from fret 5 up)", () => {
  it("open strings never get a finger number", () => {
    const evaluated = evaluatePattern([step(4, 0), step(3, 2)])!;
    expect(evaluated.steps[0].finger).toBeUndefined();
  });

  it("low position (base fret < 5) uses the 1-2-4 system, skipping the ring finger", () => {
    const evaluated = evaluatePattern([step(4, 2), step(4, 3), step(4, 4)])!;
    expect(evaluated.steps.map((s) => s.finger)).toEqual([1, 2, 4]);
  });

  it("higher position (base fret >= 5) uses standard one-finger-per-fret", () => {
    const evaluated = evaluatePattern([step(4, 5), step(4, 6), step(4, 7)])!;
    expect(evaluated.steps.map((s) => s.finger)).toEqual([1, 2, 3]);
  });

  it("a relative fret 4+ beyond the base fret is left unsuggested rather than guessed", () => {
    const evaluated = evaluatePattern([step(4, 2), step(4, 6)])!;
    expect(evaluated.steps[0].finger).toBe(1);
    expect(evaluated.steps[1].finger).toBeUndefined();
  });

  it("finger assignment is a property of the physical fret, unaffected by step order", () => {
    const ascending = evaluatePattern([step(4, 2), step(4, 3), step(4, 4)])!;
    const reversedSteps = [...ascending.steps].reverse();
    expect(reversedSteps.map((s) => s.finger)).toEqual([4, 2, 1]);
  });
});
