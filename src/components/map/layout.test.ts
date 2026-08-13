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

describe("computeRadialLayout — single adaptive ring (Phase R3.1 §16-23)", () => {
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

  it("every option sits on the SAME ring — depth never determines radial distance (no false parentage)", () => {
    // F#dim from Dm has options across multiple depths (Phase R3.1's own
    // reported example) — all of them must be equidistant from the center.
    const options = buildRankedOptions("Dm");
    const depths = new Set(options.map((o) => o.depth));
    expect(depths.size).toBeGreaterThan(1); // sanity: this chord really does span depths
    const layout = computeRadialLayout(options);
    const distances = layout.nodes.map((n) =>
      Math.hypot(n.x - layout.center.x, n.y - layout.center.y),
    );
    for (const d of distances) {
      expect(d).toBeCloseTo(layout.radius, 3);
    }
  });

  it("the ring radius stays within a bounded, readable range even for a chord with many options", () => {
    const layout = computeRadialLayout(buildRankedOptions("C"));
    expect(layout.radius).toBeGreaterThanOrEqual(160);
    expect(layout.radius).toBeLessThanOrEqual(300);
  });

  it("a small option set doesn't collapse toward the center — it still gets the minimum readable radius", () => {
    // A single synthetic option — the layout must not divide by ~0 or shrink unreasonably.
    const [oneOption] = buildRankedOptions("C");
    const layout = computeRadialLayout([oneOption]);
    expect(layout.radius).toBeGreaterThanOrEqual(160);
  });

  it("viewBox scales with the actual ring, not a fixed worst-case box", () => {
    const small = computeRadialLayout(buildRankedOptions("C").slice(0, 3));
    const large = computeRadialLayout(buildRankedOptions("C"));
    expect(large.size).toBeGreaterThanOrEqual(small.size);
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
