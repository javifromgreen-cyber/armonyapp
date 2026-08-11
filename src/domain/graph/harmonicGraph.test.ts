import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { relationshipsFrom, relationshipsAtDepth, relationshipsBetween } from "./harmonicGraph";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };
const gMajor: Key = { tonic: parseNoteName("G"), mode: "major" };
const eMinor: Key = { tonic: parseNoteName("E"), mode: "natural-minor" };

describe("relationshipsFrom — cumulative Zoom depth", () => {
  it("Zoom 1 from Cmaj7 in C major: only diatonic + relative + (no functionalDominant in major)", () => {
    const edges = relationshipsFrom(parseChordSymbol("Cmaj7"), cMajor, 1);
    expect(edges.every((e) => e.harmonicDepth === 1)).toBe(true);
    expect(new Set(edges.map((e) => e.relationshipType))).toEqual(new Set(["diatonic", "relative"]));
  });

  it("Zoom 2 includes everything from Zoom 1 plus new Zoom 2 families", () => {
    const zoom1 = relationshipsFrom(parseChordSymbol("C"), cMajor, 1);
    const zoom2 = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    expect(zoom2.length).toBeGreaterThan(zoom1.length);
    for (const edge of zoom1) {
      expect(zoom2).toContainEqual(edge);
    }
    expect(zoom2.every((e) => e.harmonicDepth <= 2)).toBe(true);
  });

  it("Zoom 3 and Zoom 4 keep growing cumulatively, never shrinking", () => {
    const source = parseChordSymbol("C");
    const counts = [1, 2, 3, 4].map((depth) => relationshipsFrom(source, cMajor, depth as 1 | 2 | 3 | 4).length);
    expect(counts[1]).toBeGreaterThanOrEqual(counts[0]);
    expect(counts[2]).toBeGreaterThanOrEqual(counts[1]);
    expect(counts[3]).toBeGreaterThanOrEqual(counts[2]);
  });

  it("results are sorted by strength descending", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 4);
    for (let i = 1; i < edges.length; i++) {
      expect(edges[i - 1].strength).toBeGreaterThanOrEqual(edges[i].strength);
    }
  });

  it("negative: Zoom 3/4-only relationship types never appear when maxDepth is 1 or 2", () => {
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    const deepOnlyTypes = ["chromaticMediant", "nearbyKey", "commonTone", "distantKey", "tritoneSubstitution", "passingDiminished", "secondaryDominantChain"];
    for (const edge of edges) {
      expect(deepOnlyTypes).not.toContain(edge.relationshipType);
    }
  });
});

describe("relationshipsAtDepth — \"what becomes available when Zoom 3 unlocks\"", () => {
  it("returns only the NEW relationships introduced at exactly Zoom 3, not the cumulative set", () => {
    const atDepth3 = relationshipsAtDepth(parseChordSymbol("C"), cMajor, 3);
    expect(atDepth3.every((e) => e.harmonicDepth === 3)).toBe(true);
    expect(atDepth3.length).toBeGreaterThan(0);

    const cumulativeUpTo3 = relationshipsFrom(parseChordSymbol("C"), cMajor, 3);
    const cumulativeUpTo2 = relationshipsFrom(parseChordSymbol("C"), cMajor, 2);
    expect(cumulativeUpTo3.length - cumulativeUpTo2.length).toBe(atDepth3.length);
  });
});

describe("relationshipsBetween — \"what connects Cmaj7 and A7?\"", () => {
  it("A7 is reachable from the tonic as V7/vi (secondary dominant)", () => {
    const edges = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("A7"), cMajor);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.relationshipType === "secondaryDominant")).toBe(true);
    expect(chordSymbol(edges[0].target)).toBe("A7");
  });

  it("Am is reachable from C via more than one relationship (diatonic, relative, substitution)", () => {
    const edges = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("Am"), cMajor);
    const types = new Set(edges.map((e) => e.relationshipType));
    expect(types).toEqual(new Set(["diatonic", "relative", "substitution"]));
  });

  it("negative: unrelated chords in this context have no connecting edge", () => {
    // F#7 has no direct relationship from C in C major within any Zoom level.
    expect(relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("F#7"), cMajor)).toEqual([]);
  });

  it("respects maxDepth: a Zoom-3-only relationship is invisible when capped at Zoom 2", () => {
    const capped = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("E"), cMajor, 2);
    expect(capped).toEqual([]);
    const full = relationshipsBetween(parseChordSymbol("C"), parseChordSymbol("E"), cMajor, 3);
    expect(full.length).toBeGreaterThan(0);
  });
});

describe("no accidental duplicate edges", () => {
  function duplicateKeys(source: string, context: Key): string[] {
    const edges = relationshipsFrom(parseChordSymbol(source), context, 4);
    const seen = new Map<string, number>();
    for (const edge of edges) {
      const key = `${edge.relationshipType}->${chordSymbol(edge.target)}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  }

  it("C major from every diatonic chord: no (relationshipType, target) pair repeats", () => {
    for (const symbol of ["C", "Dm", "Em", "F", "G", "Am", "Bdim"]) {
      expect(duplicateKeys(symbol, cMajor)).toEqual([]);
    }
  });

  it("A minor from every diatonic chord: no (relationshipType, target) pair repeats", () => {
    for (const symbol of ["Am", "Bdim", "C", "Dm", "Em", "F", "G"]) {
      expect(duplicateKeys(symbol, aMinor)).toEqual([]);
    }
  });

  it("known cross-family target overlaps are intentional (different relationshipType is fine)", () => {
    // Am is reachable from C as both 'diatonic' and 'relative' and 'substitution' —
    // that's 3 different relationshipTypes to the same target, which is allowed;
    // only a repeated (type, target) pair would indicate a bug.
    const edges = relationshipsFrom(parseChordSymbol("C"), cMajor, 4);
    const toAm = edges.filter((e) => chordSymbol(e.target) === "Am");
    expect(toAm.length).toBeGreaterThan(1);
    expect(new Set(toAm.map((e) => e.relationshipType)).size).toBe(toAm.length);
  });

  it("generalizes to other keys: G major and E natural minor, from every diatonic chord", () => {
    for (const symbol of ["G", "Am", "Bm", "C", "D", "Em", "F#dim"]) {
      expect(duplicateKeys(symbol, gMajor)).toEqual([]);
    }
    for (const symbol of ["Em", "F#dim", "G", "Am", "Bm", "C", "D"]) {
      expect(duplicateKeys(symbol, eMinor)).toEqual([]);
    }
  });
});

describe("cross-key verification — the coincidence exclusions generalize beyond C major/A minor", () => {
  it("G major's borrowed bVII (F) is excluded from nearbyKey's subdominant-of-subdominant slot", () => {
    const targets = relationshipsAtDepth(parseChordSymbol("G"), gMajor, 3)
      .filter((e) => e.relationshipType === "nearbyKey")
      .map((e) => chordSymbol(e.target));
    expect(targets.sort()).toEqual(["A", "Dm", "F#m"].sort());
  });

  it("G major's chromatic mediants from the tonic: B and E (Bb/Ab excluded as borrowed bIII/bVI)", () => {
    const targets = relationshipsAtDepth(parseChordSymbol("G"), gMajor, 3)
      .filter((e) => e.relationshipType === "chromaticMediant")
      .map((e) => chordSymbol(e.target));
    expect(targets.sort()).toEqual(["B", "E"].sort());
  });

  it("E minor: V7/III (D7) is excluded from secondaryDominant, kept only as diatonic bVII7", () => {
    const secondaryDominants = relationshipsFrom(parseChordSymbol("Em"), eMinor, 2)
      .filter((e) => e.relationshipType === "secondaryDominant")
      .map((e) => chordSymbol(e.target));
    expect(secondaryDominants).not.toContain("D7");

    const sevenths = relationshipsFrom(parseChordSymbol("Em"), eMinor, 2)
      .filter((e) => e.relationshipType === "diatonicSeventh")
      .map((e) => chordSymbol(e.target));
    expect(sevenths).toContain("D7");
  });

  it("E minor: the functional dominant is B7 (not the natural/weak Bm), reaching Em through D#", () => {
    const edges = relationshipsFrom(parseChordSymbol("Em"), eMinor, 1).filter(
      (e) => e.relationshipType === "functionalDominant" || e.relationshipType === "leadingToneDiminished",
    );
    const byType = Object.fromEntries(edges.map((e) => [e.relationshipType, chordSymbol(e.target)]));
    expect(byType.functionalDominant).toBe("B7");
    expect(byType.leadingToneDiminished).toBe("D#dim7");
  });

  it("E minor: the wrap-pair passing-diminished duplicate of the leading-tone chord (D#dim7) is suppressed", () => {
    const targets = relationshipsFrom(parseChordSymbol("Em"), eMinor, 3)
      .filter((e) => e.relationshipType === "passingDiminished")
      .map((e) => chordSymbol(e.target));
    expect(targets).not.toContain("D#dim7");
    expect(targets).toContain("E#dim7");
  });

  it("E minor's nearbyKey keeps all 4 candidates (minor's sparse borrowed set never collides)", () => {
    const targets = relationshipsAtDepth(parseChordSymbol("Em"), eMinor, 3)
      .filter((e) => e.relationshipType === "nearbyKey")
      .map((e) => chordSymbol(e.target));
    expect(targets.sort()).toEqual(["A", "Dm", "F", "F#m"].sort());
  });
});

describe("every edge carries complete, self-consistent metadata", () => {
  it("source/context are correct on every edge, and explanation has a key", () => {
    const source = parseChordSymbol("C");
    for (const edge of relationshipsFrom(source, cMajor, 4)) {
      expect(edge.source).toEqual(source);
      expect(edge.context).toEqual(cMajor);
      expect(typeof edge.explanation.key).toBe("string");
      expect(edge.explanation.key.length).toBeGreaterThan(0);
      expect(edge.strength).toBeGreaterThan(0);
      expect(edge.strength).toBeLessThanOrEqual(1);
    }
  });
});
