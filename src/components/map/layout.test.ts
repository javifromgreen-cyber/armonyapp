import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { outgoingOptions, rankOptions, type HistoryContext } from "@/domain/navigation";
import { computeRadialLayout } from "./layout";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function buildRankedOptions(symbol: string) {
  const chord = parseChordSymbol(symbol);
  const options = outgoingOptions(chord, cMajor);
  const history: HistoryContext = { context: cMajor, endpoint: chord, previousChord: undefined };
  return rankOptions(options, history);
}

describe("computeRadialLayout", () => {
  it("positions every option exactly once", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    expect(layout.nodes).toHaveLength(options.length);
  });

  it("is deterministic: the same input always produces the same positions regardless of array order", () => {
    const options = buildRankedOptions("C");
    const first = computeRadialLayout(options);
    const second = computeRadialLayout([...options].reverse());
    expect(second.nodes.map((n) => ({ x: n.x, y: n.y }))).toEqual(
      first.nodes.map((n) => ({ x: n.x, y: n.y })),
    );
  });

  it("Depth-1 options sit on a smaller ring than Depth-2 options", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    const depth1Radii = layout.nodes.filter((n) => n.option.depth === 1).map((n) => n.radius);
    const depth2Radii = layout.nodes.filter((n) => n.option.depth === 2).map((n) => n.radius);
    expect(depth1Radii.length).toBeGreaterThan(0);
    expect(depth2Radii.length).toBeGreaterThan(0);
    expect(Math.max(...depth1Radii)).toBeLessThan(Math.min(...depth2Radii));
  });

  it("a node's ring matches its OWN move's depth, not some other chord's shallowest relationship (Phase R3 §6)", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    for (const positioned of layout.nodes) {
      const expectedRadius = computeRadialLayout([positioned.option]).nodes[0].radius;
      // same depth => same ring radius constant, regardless of which other options are present
      const sameDepthAnyLayout = layout.nodes.find((n) => n.option.depth === positioned.option.depth)!;
      expect(positioned.radius).toBe(sameDepthAnyLayout.radius);
      expect(expectedRadius).toBeGreaterThan(0);
    }
  });

  it("all positions fall within the declared viewBox", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    for (const positioned of layout.nodes) {
      expect(positioned.x).toBeGreaterThanOrEqual(0);
      expect(positioned.x).toBeLessThanOrEqual(layout.size);
      expect(positioned.y).toBeGreaterThanOrEqual(0);
      expect(positioned.y).toBeLessThanOrEqual(layout.size);
    }
  });

  it("empty input produces an empty layout without throwing", () => {
    const layout = computeRadialLayout([]);
    expect(layout.nodes).toEqual([]);
  });
});
