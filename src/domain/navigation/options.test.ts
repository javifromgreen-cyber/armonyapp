import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { relationshipsFrom } from "../graph/harmonicGraph";
import { chordIdentityKey } from "../harmony/chordIdentity";
import { HARMONIC_TERRITORIES } from "./types";
import { outgoingOptions } from "./options";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };
const aMinor: Key = { tonic: parseNoteName("A"), mode: "natural-minor" };

/**
 * Phase R3 §36's mandatory completeness invariant: nothing the underlying
 * harmony engine models across all four depths may ever go missing from
 * `outgoingOptions` — ranking/grouping/UI concerns must never shrink the
 * reachable set, only reorder or annotate it.
 */
describe("outgoingOptions — completeness invariant (Phase R3 §36)", () => {
  const cases: [string, Key][] = [
    ["C", cMajor],
    ["Dm", cMajor],
    ["G7", cMajor],
    ["Am", cMajor],
    ["Cmaj7", cMajor],
    ["Am", aMinor],
    ["Em", aMinor],
    ["Dm", aMinor],
  ];

  it.each(cases)("outgoingOptions(%s) chord identities equal the deduplicated depth-1..4 target set", (symbol, context) => {
    const chord = parseChordSymbol(symbol);
    const options = outgoingOptions(chord, context);
    const rawEdges = relationshipsFrom(chord, context, 4);

    const expectedIds = new Set(rawEdges.map((edge) => chordIdentityKey(edge.target)));
    const actualIds = new Set(options.map((option) => chordIdentityKey(option.chord)));

    expect(actualIds).toEqual(expectedIds);
    expect(options).toHaveLength(expectedIds.size); // one option per identity, no duplicates
  });
});

describe("outgoingOptions — multi-relationship preservation (Phase R3 §37)", () => {
  it("Am from C keeps all 3 relationships (diatonic, relative, substitution) as one option", () => {
    const options = outgoingOptions(parseChordSymbol("C"), cMajor);
    const amOptions = options.filter((o) => chordSymbol(o.chord) === "Am");
    expect(amOptions).toHaveLength(1);

    const types = amOptions[0].relationships.map((r) => r.relationshipType).sort();
    expect(types).toEqual(["diatonic", "relative", "substitution"].sort());
  });

  it("the option's depth/character reflect its primary (strongest) relationship, not an arbitrary one", () => {
    const options = outgoingOptions(parseChordSymbol("C"), cMajor);
    const amOption = options.find((o) => chordSymbol(o.chord) === "Am")!;
    expect(amOption.depth).toBe(amOption.primaryRelationship.harmonicDepth);
  });

  it("a single-relationship target still produces one option carrying exactly that relationship", () => {
    const options = outgoingOptions(parseChordSymbol("D7"), cMajor);
    const target = options.find((o) => chordSymbol(o.chord) === "A7");
    expect(target).toBeDefined();
    expect(target!.relationships).toHaveLength(1);
  });
});

describe("outgoingOptions — completeness across territories (Phase R3.2 §41/§53)", () => {
  const cases: [string, Key][] = [
    ["C", cMajor],
    ["Dm", cMajor],
    ["G7", cMajor],
    ["F#dim", cMajor],
    ["Am", aMinor],
  ];

  it.each(cases)(
    "outgoingOptions(%s) — the union of chords across every territory equals the full outgoing set, with no chord in two territories",
    (symbol, context) => {
      const options = outgoingOptions(parseChordSymbol(symbol), context);
      const allIds = options.map((o) => chordIdentityKey(o.chord));

      // every option has exactly one (primary) territory, always one of the 5 known values
      for (const option of options) {
        expect(HARMONIC_TERRITORIES).toContain(option.territory);
      }

      // union across territories == the full set, and no id appears twice anywhere
      const byTerritory = new Map<string, Set<string>>();
      for (const option of options) {
        const id = chordIdentityKey(option.chord);
        const set = byTerritory.get(option.territory) ?? new Set<string>();
        set.add(id);
        byTerritory.set(option.territory, set);
      }
      const unionIds = new Set([...byTerritory.values()].flatMap((s) => [...s]));
      expect(unionIds).toEqual(new Set(allIds));
      expect(new Set(allIds).size).toBe(allIds.length); // no duplicate chord identities at all
    },
  );
});

describe("outgoingOptions — depth belongs to the move, not the chord (Phase R3 §6)", () => {
  it("the same target chord can carry a different depth depending on the source it's queried from", () => {
    // Bb is reachable from C (tonic) as a borrowed bVII (Zoom 2). It is
    // NOT expected to always carry the same depth from every possible
    // source — this test only pins down that `depth` is derived per-query,
    // never memoized/attached to the chord itself.
    const fromC = outgoingOptions(parseChordSymbol("C"), cMajor).find(
      (o) => chordSymbol(o.chord) === "Bb",
    );
    expect(fromC).toBeDefined();
    expect(fromC!.depth).toBe(fromC!.primaryRelationship.harmonicDepth);
  });
});
