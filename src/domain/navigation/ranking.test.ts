import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords/chord";
import { parseNoteName } from "../notes/note";
import type { Key } from "../keys/key";
import { chordIdentityKey } from "../harmony/chordIdentity";
import { DEFAULT_TIME_SIGNATURE } from "../progression/progression";
import type { Progression } from "../progression/types";
import { outgoingOptions } from "./options";
import { startPath, advancePath } from "./path";
import { rankOptions, resolveHistoryContext, type HistoryContext } from "./ranking";
import type { RankedNavigationOption } from "./types";

const cMajor: Key = { tonic: parseNoteName("C"), mode: "major" };

function emptyProgression(): Progression {
  return { items: [], bpm: 90, timeSignature: DEFAULT_TIME_SIGNATURE };
}

function rankPosition(ranked: RankedNavigationOption[], symbol: string): number {
  return ranked.findIndex((r) => chordIdentityKey(r.chord) === chordIdentityKey(parseChordSymbol(symbol)));
}

describe("rankOptions — completeness is never affected by ranking (Phase R3 §3/§18)", () => {
  it("ranking the same options under two different histories never changes membership, only order", () => {
    const options = outgoingOptions(parseChordSymbol("Dm"), cMajor);
    const cold: HistoryContext = { context: cMajor, endpoint: parseChordSymbol("Dm"), previousChord: undefined };
    const reinforced: HistoryContext = {
      context: cMajor,
      endpoint: parseChordSymbol("Dm"),
      previousChord: parseChordSymbol("Am"),
    };

    const rankedCold = rankOptions(options, cold);
    const rankedReinforced = rankOptions(options, reinforced);

    const coldIds = new Set(rankedCold.map((o) => chordIdentityKey(o.chord)));
    const reinforcedIds = new Set(rankedReinforced.map((o) => chordIdentityKey(o.chord)));
    const originalIds = new Set(options.map((o) => chordIdentityKey(o.chord)));

    expect(coldIds).toEqual(originalIds);
    expect(reinforcedIds).toEqual(originalIds);
  });
});

describe("rankOptions — context changes prominence (Phase R3 §18/§19/§39)", () => {
  it("Dm -> ? : G7 ranks and scores higher when arrived at via C -> Am -> Dm than cold", () => {
    const options = outgoingOptions(parseChordSymbol("Dm"), cMajor);

    const cold: HistoryContext = { context: cMajor, endpoint: parseChordSymbol("Dm"), previousChord: undefined };
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    path = advancePath(path, cMajor, parseChordSymbol("Dm"));
    const reinforced = resolveHistoryContext(path, emptyProgression(), cMajor);
    expect(chordSymbol(reinforced.previousChord!)).toBe("Am");

    const rankedCold = rankOptions(options, cold);
    const rankedReinforced = rankOptions(options, reinforced);

    const coldG7 = rankedCold.find((o) => chordSymbol(o.chord) === "G7")!;
    const reinforcedG7 = rankedReinforced.find((o) => chordSymbol(o.chord) === "G7")!;
    expect(reinforcedG7.contextScore).toBeGreaterThan(coldG7.contextScore);

    const coldIndex = rankPosition(rankedCold, "G7");
    const reinforcedIndex = rankPosition(rankedReinforced, "G7");
    expect(reinforcedIndex).toBeLessThan(coldIndex); // moved toward the front
  });

  it("dominant resolutions gain prominence: G7 -> C scores above G7's own raw diatonic strength", () => {
    const options = outgoingOptions(parseChordSymbol("G7"), cMajor);
    const history: HistoryContext = { context: cMajor, endpoint: parseChordSymbol("G7"), previousChord: parseChordSymbol("Dm") };
    const ranked = rankOptions(options, history);
    const toC = ranked.find((o) => chordSymbol(o.chord) === "C")!;
    expect(toC.contextScore).toBeGreaterThan(toC.primaryRelationship.strength);
  });

  it("secondary dominant targets gain prominence: E7 -> Am ranks above E7's plain diatonic siblings", () => {
    const options = outgoingOptions(parseChordSymbol("E7"), cMajor);
    const history: HistoryContext = { context: cMajor, endpoint: parseChordSymbol("E7"), previousChord: parseChordSymbol("C") };
    const ranked = rankOptions(options, history);
    const amIndex = rankPosition(ranked, "Am");
    const dmIndex = rankPosition(ranked, "Dm"); // a plain diatonic sibling, no secondary-dominant pull
    expect(amIndex).toBeLessThan(dmIndex);
  });
});

describe("rankOptions — colour/chromatic/borrowed/substitution possibilities survive ranking (Phase R3 §39)", () => {
  const options = outgoingOptions(parseChordSymbol("C"), cMajor);
  const history: HistoryContext = { context: cMajor, endpoint: parseChordSymbol("C"), previousChord: undefined };
  const ranked = rankOptions(options, history);

  it("Bb (borrowed) is present", () => {
    expect(ranked.some((o) => chordSymbol(o.chord) === "Bb")).toBe(true);
  });

  it("Am (also reachable as a substitution) is present", () => {
    const am = ranked.find((o) => chordSymbol(o.chord) === "Am");
    expect(am).toBeDefined();
    expect(am!.relationships.map((r) => r.relationshipType)).toContain("substitution");
  });

  it("no duplicate target chord identities after ranking", () => {
    const ids = ranked.map((o) => chordIdentityKey(o.chord));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveHistoryContext — Phase R3 §22 precedence rule", () => {
  it("uses the exploration path's previous chord when the progression's last chord doesn't match the endpoint", () => {
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("Am"));
    const history = resolveHistoryContext(path, emptyProgression(), cMajor);
    expect(chordSymbol(history.endpoint)).toBe("Am");
    expect(chordSymbol(history.previousChord!)).toBe("C");
  });

  it("prefers the REAL progression's history when its last chord matches the current endpoint", () => {
    // Exploration path independently went C -> G7 (previous = C), but the
    // actual composed progression ends ...Dm7 -> G7 — since the progression's
    // last chord (G7) matches the current endpoint, §22 says use the
    // progression's history (Dm7), not the exploration path's (C).
    let path = startPath(parseChordSymbol("C"));
    path = advancePath(path, cMajor, parseChordSymbol("G7"));

    const progression: Progression = {
      items: [
        { id: "1", chord: parseChordSymbol("Dm7"), durationBeats: 4 },
        { id: "2", chord: parseChordSymbol("G7"), durationBeats: 4 },
      ],
      bpm: 90,
      timeSignature: "4/4",
    };

    const history = resolveHistoryContext(path, progression, cMajor);
    expect(chordSymbol(history.previousChord!)).toBe("Dm7");
  });

  it("falls back to the exploration path when the progression is empty", () => {
    let path = startPath(parseChordSymbol("Dm"));
    path = advancePath(path, cMajor, parseChordSymbol("G7"));
    const history = resolveHistoryContext(path, emptyProgression(), cMajor);
    expect(chordSymbol(history.previousChord!)).toBe("Dm");
  });
});
