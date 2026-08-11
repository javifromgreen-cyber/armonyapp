import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { relationshipsFrom } from "./harmonicGraph";
import { groupRelationshipsByTarget } from "./mapGraph";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

describe("groupRelationshipsByTarget", () => {
  it("C -> Am collapses diatonic + relative + substitution into one node", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);

    const amNodes = nodes.filter((n) => chordSymbol(n.chord) === "Am");
    expect(amNodes).toHaveLength(1);

    const amTypes = amNodes[0].relationships.map((r) => r.relationshipType).sort();
    expect(amTypes).toEqual(["diatonic", "relative", "substitution"].sort());
  });

  it("relationship metadata survives aggregation (each edge kept intact, not merged/lost)", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);
    const amNode = nodes.find((n) => chordSymbol(n.chord) === "Am")!;

    for (const relationshipType of ["diatonic", "relative", "substitution"]) {
      const match = amNode.relationships.find((r) => r.relationshipType === relationshipType);
      expect(match).toBeDefined();
      expect(match!.explanation.key.length).toBeGreaterThan(0);
      expect(chordSymbol(match!.target)).toBe("Am");
    }
  });

  it("the total node count is the number of DISTINCT target chords, not the number of edges", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);
    const distinctTargets = new Set(edges.map((e) => chordSymbol(e.target)));
    expect(nodes).toHaveLength(distinctTargets.size);
    expect(nodes.length).toBeLessThan(edges.length); // proves de-duplication actually happened
  });

  it("primaryRelationship is the strongest of the group", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);
    const amNode = nodes.find((n) => chordSymbol(n.chord) === "Am")!;
    const maxStrength = Math.max(...amNode.relationships.map((r) => r.strength));
    expect(amNode.primaryRelationship.strength).toBe(maxStrength);
  });

  it("relationships within a node are sorted strongest-first", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);
    for (const node of nodes) {
      for (let i = 1; i < node.relationships.length; i++) {
        expect(node.relationships[i - 1].strength).toBeGreaterThanOrEqual(
          node.relationships[i].strength,
        );
      }
    }
  });

  it("introducedAtDepth is the shallowest depth among a chord's relationships", () => {
    // Am is diatonic (Zoom 1) AND substitution (Zoom 2) from C — it must be
    // introduced at Zoom 1, not retreat to Zoom 2 just because a deeper
    // relationship also applies.
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const nodes = groupRelationshipsByTarget(edges);
    const amNode = nodes.find((n) => chordSymbol(n.chord) === "Am")!;
    expect(amNode.introducedAtDepth).toBe(1);
  });

  it("a single-relationship chord (e.g. F#7, present only via secondaryDominantChain at Zoom 3) still produces exactly one node", () => {
    const edges = relationshipsFrom(parseChordSymbol("D7"), cMajor, 3);
    const nodes = groupRelationshipsByTarget(edges);
    const target = nodes.find((n) => chordSymbol(n.chord) === "A7");
    expect(target).toBeDefined();
    expect(target!.relationships).toHaveLength(1);
    expect(target!.primaryRelationship).toBe(target!.relationships[0]);
  });

  it("empty input produces no nodes", () => {
    expect(groupRelationshipsByTarget([])).toEqual([]);
  });
});
