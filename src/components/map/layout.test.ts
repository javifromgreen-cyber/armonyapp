import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/domain/chords";
import { parseNoteName } from "@/domain/notes";
import type { Key } from "@/domain/keys";
import { relationshipsFrom, groupRelationshipsByTarget } from "@/domain/graph";
import { computeRadialLayout } from "./layout";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function buildNodes(depth: 1 | 2 | 3 | 4) {
  const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, depth);
  return groupRelationshipsByTarget(edges);
}

describe("computeRadialLayout", () => {
  it("positions every node exactly once", () => {
    const nodes = buildNodes(2);
    const layout = computeRadialLayout(nodes);
    expect(layout.nodes).toHaveLength(nodes.length);
  });

  it("is deterministic: the same input always produces the same positions", () => {
    const nodes = buildNodes(3);
    const first = computeRadialLayout(nodes);
    const second = computeRadialLayout([...nodes].reverse());
    expect(second.nodes.map((n) => ({ x: n.x, y: n.y }))).toEqual(
      first.nodes.map((n) => ({ x: n.x, y: n.y })),
    );
  });

  it("Zoom-1-only nodes sit on a smaller ring than Zoom-2-only nodes", () => {
    const nodes = buildNodes(2);
    const layout = computeRadialLayout(nodes);
    const zoom1Radii = layout.nodes.filter((n) => n.node.introducedAtDepth === 1).map((n) => n.radius);
    const zoom2Radii = layout.nodes.filter((n) => n.node.introducedAtDepth === 2).map((n) => n.radius);
    expect(zoom1Radii.length).toBeGreaterThan(0);
    expect(zoom2Radii.length).toBeGreaterThan(0);
    expect(Math.max(...zoom1Radii)).toBeLessThan(Math.min(...zoom2Radii));
  });

  it("all positions fall within the declared viewBox", () => {
    const nodes = buildNodes(4);
    const layout = computeRadialLayout(nodes);
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
