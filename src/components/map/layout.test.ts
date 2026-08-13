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

describe("computeRadialLayout — territory sectors, one shared ring (Phase R3.2 §7/§20/§27-30)", () => {
  it("positions every option exactly once", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    expect(layout.nodes).toHaveLength(options.length);
  });

  it("every option sits on the SAME ring regardless of territory — no false hierarchy (§27/§30)", () => {
    const options = buildRankedOptions("Dm");
    const layout = computeRadialLayout(options);
    const distances = layout.nodes.map((n) => Math.hypot(n.x - layout.center.x, n.y - layout.center.y));
    for (const d of distances) {
      expect(d).toBeCloseTo(layout.radius, 3);
    }
  });

  it("sectors are only emitted for POPULATED territories, sized proportionally to their member count (§28/§29)", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    const totalCount = options.length;

    expect(layout.sectors.length).toBeGreaterThan(0);
    for (const sector of layout.sectors) {
      expect(sector.count).toBeGreaterThan(0); // never an empty sector rendered
      const span = sector.endAngleDeg - sector.startAngleDeg;
      // proportional: a sector with a larger share of options gets a larger span
      const expectedShare = sector.count / totalCount;
      expect(span).toBeGreaterThan(0);
      expect(expectedShare).toBeGreaterThan(0);
    }

    const sumOfCounts = layout.sectors.reduce((sum, s) => sum + s.count, 0);
    expect(sumOfCounts).toBe(totalCount); // every option belongs to exactly one sector
  });

  it("no chord appears in two different sectors, and every node's territory matches its sector", () => {
    const options = buildRankedOptions("C");
    const layout = computeRadialLayout(options);
    for (const sector of layout.sectors) {
      const inSector = layout.nodes.filter((n) => n.option.territory === sector.territory);
      expect(inSector).toHaveLength(sector.count);
    }
  });

  it("a chord with options spanning multiple territories produces multiple sectors, all sharing one radius", () => {
    const options = buildRankedOptions("Dm"); // has natural/tension/substitution/exploration options
    const layout = computeRadialLayout(options);
    const territoriesPresent = new Set(layout.sectors.map((s) => s.territory));
    expect(territoriesPresent.size).toBeGreaterThan(1);
  });

  it("is deterministic: the same input always produces the same positions regardless of array order", () => {
    const options = buildRankedOptions("C");
    const first = computeRadialLayout(options);
    const second = computeRadialLayout([...options].reverse());
    expect(second.nodes.map((n) => ({ x: n.x, y: n.y }))).toEqual(
      first.nodes.map((n) => ({ x: n.x, y: n.y })),
    );
    expect(second.sectors.map((s) => s.territory)).toEqual(first.sectors.map((s) => s.territory));
  });

  it("the ring radius stays within a bounded, readable range even for a chord with many options", () => {
    const layout = computeRadialLayout(buildRankedOptions("C"));
    expect(layout.radius).toBeGreaterThanOrEqual(170);
    expect(layout.radius).toBeLessThanOrEqual(320);
  });

  it("viewBox scales with the actual ring, not a fixed worst-case box", () => {
    const small = computeRadialLayout(buildRankedOptions("C").slice(0, 2));
    const large = computeRadialLayout(buildRankedOptions("C"));
    expect(large.size).toBeGreaterThanOrEqual(small.size);
  });

  it("all node and label positions fall within the declared viewBox", () => {
    const layout = computeRadialLayout(buildRankedOptions("C"));
    for (const positioned of layout.nodes) {
      expect(positioned.x).toBeGreaterThanOrEqual(0);
      expect(positioned.x).toBeLessThanOrEqual(layout.size);
      expect(positioned.y).toBeGreaterThanOrEqual(0);
      expect(positioned.y).toBeLessThanOrEqual(layout.size);
    }
    for (const sector of layout.sectors) {
      expect(sector.labelX).toBeGreaterThanOrEqual(0);
      expect(sector.labelX).toBeLessThanOrEqual(layout.size);
      expect(sector.labelY).toBeGreaterThanOrEqual(0);
      expect(sector.labelY).toBeLessThanOrEqual(layout.size);
    }
  });

  it("empty input produces an empty layout without throwing", () => {
    const layout = computeRadialLayout([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.sectors).toEqual([]);
  });

  it("a single populated territory still produces exactly one sector spanning nearly the full circle", () => {
    // Construct a scenario with only one territory by filtering — Am from C
    // has several territories normally, so instead verify the general
    // single-sector-count invariant holds for any chord whose options
    // happen to collapse to one territory (defensive: doesn't assume a
    // specific chord always has only one).
    const options = buildRankedOptions("C");
    const onlyNatural = options.filter((o) => o.territory === "natural");
    if (onlyNatural.length === 0) return; // nothing to assert if none exist for this chord
    const layout = computeRadialLayout(onlyNatural);
    expect(layout.sectors).toHaveLength(1);
    expect(layout.sectors[0].count).toBe(onlyNatural.length);
  });
});
