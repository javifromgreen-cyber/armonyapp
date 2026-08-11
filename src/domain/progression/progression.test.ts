import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "../chords";
import {
  createEmptyProgression,
  createProgressionItem,
  addItem,
  removeItem,
  reorderItem,
  setItemDuration,
  clampDuration,
  clampBpm,
  setBpm,
  setTimeSignature,
  clearProgression,
  transposeProgression,
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_DURATION_BEATS,
  MIN_BPM,
  MAX_BPM,
  MIN_DURATION_BEATS,
  MAX_DURATION_BEATS,
} from "./progression";
import type { Progression } from "./types";

function progressionOf(...symbols: string[]): Progression {
  return symbols.reduce(
    (progression, symbol) => addItem(progression, createProgressionItem(parseChordSymbol(symbol))),
    createEmptyProgression(),
  );
}

describe("createEmptyProgression", () => {
  it("starts empty with the documented defaults", () => {
    const progression = createEmptyProgression();
    expect(progression.items).toEqual([]);
    expect(progression.bpm).toBe(DEFAULT_BPM);
    expect(progression.bpm).toBe(90);
    expect(progression.timeSignature).toBe(DEFAULT_TIME_SIGNATURE);
    expect(progression.timeSignature).toBe("4/4");
  });
});

describe("createProgressionItem", () => {
  it("defaults duration to DEFAULT_DURATION_BEATS (4)", () => {
    const item = createProgressionItem(parseChordSymbol("Cmaj7"));
    expect(item.durationBeats).toBe(4);
    expect(item.durationBeats).toBe(DEFAULT_DURATION_BEATS);
  });

  it("gives every item a unique id", () => {
    const a = createProgressionItem(parseChordSymbol("C"));
    const b = createProgressionItem(parseChordSymbol("C"));
    expect(a.id).not.toBe(b.id);
  });

  it("clamps an out-of-range explicit duration", () => {
    expect(createProgressionItem(parseChordSymbol("C"), 0).durationBeats).toBe(MIN_DURATION_BEATS);
    expect(createProgressionItem(parseChordSymbol("C"), 999).durationBeats).toBe(
      MAX_DURATION_BEATS,
    );
  });
});

describe("addItem", () => {
  it("appends to the end of the progression", () => {
    const progression = progressionOf("Cmaj7", "Am7");
    const item = createProgressionItem(parseChordSymbol("Dm7"));
    const next = addItem(progression, item);
    expect(next.items.map((i) => chordSymbol(i.chord))).toEqual(["Cmaj7", "Am7", "Dm7"]);
  });

  it("does not mutate the original progression", () => {
    const progression = progressionOf("Cmaj7");
    const next = addItem(progression, createProgressionItem(parseChordSymbol("Am7")));
    expect(progression.items).toHaveLength(1);
    expect(next.items).toHaveLength(2);
  });
});

describe("removeItem", () => {
  it("removes exactly the item with the matching id, preserving order of the rest", () => {
    const progression = progressionOf("Cmaj7", "Am7", "Dm7");
    const targetId = progression.items[1].id;
    const next = removeItem(progression, targetId);
    expect(next.items.map((i) => chordSymbol(i.chord))).toEqual(["Cmaj7", "Dm7"]);
  });

  it("is a no-op for an id that doesn't exist", () => {
    const progression = progressionOf("Cmaj7");
    const next = removeItem(progression, "not-a-real-id");
    expect(next.items).toHaveLength(1);
  });
});

describe("reorderItem", () => {
  it("moves an item from one index to another", () => {
    const progression = progressionOf("Cmaj7", "Am7", "Dm7", "G7");
    const next = reorderItem(progression, 0, 2);
    expect(next.items.map((i) => chordSymbol(i.chord))).toEqual(["Am7", "Dm7", "Cmaj7", "G7"]);
  });

  it("moving backward works the same way", () => {
    const progression = progressionOf("Cmaj7", "Am7", "Dm7", "G7");
    const next = reorderItem(progression, 3, 0);
    expect(next.items.map((i) => chordSymbol(i.chord))).toEqual(["G7", "Cmaj7", "Am7", "Dm7"]);
  });

  it("is a no-op when fromIndex equals toIndex or indices are out of range", () => {
    const progression = progressionOf("Cmaj7", "Am7");
    expect(reorderItem(progression, 0, 0)).toBe(progression);
    expect(reorderItem(progression, -1, 0)).toBe(progression);
    expect(reorderItem(progression, 0, 5)).toBe(progression);
  });
});

describe("setItemDuration", () => {
  it("changes only the targeted item's duration", () => {
    const progression = progressionOf("Cmaj7", "Am7");
    const targetId = progression.items[0].id;
    const next = setItemDuration(progression, targetId, 2);
    expect(next.items[0].durationBeats).toBe(2);
    expect(next.items[1].durationBeats).toBe(DEFAULT_DURATION_BEATS);
  });

  it("clamps to [MIN_DURATION_BEATS, MAX_DURATION_BEATS] and rounds", () => {
    expect(clampDuration(0)).toBe(MIN_DURATION_BEATS);
    expect(clampDuration(-5)).toBe(MIN_DURATION_BEATS);
    expect(clampDuration(1000)).toBe(MAX_DURATION_BEATS);
    expect(clampDuration(3.6)).toBe(4);
  });
});

describe("BPM validation", () => {
  it("setBpm clamps to [MIN_BPM, MAX_BPM]", () => {
    const progression = createEmptyProgression();
    expect(setBpm(progression, 5).bpm).toBe(MIN_BPM);
    expect(setBpm(progression, 5000).bpm).toBe(MAX_BPM);
    expect(setBpm(progression, 120).bpm).toBe(120);
  });

  it("clampBpm rounds fractional input", () => {
    expect(clampBpm(90.6)).toBe(91);
  });
});

describe("setTimeSignature", () => {
  it("updates the time signature without touching items", () => {
    const progression = progressionOf("Cmaj7", "Am7");
    const next = setTimeSignature(progression, "3/4");
    expect(next.timeSignature).toBe("3/4");
    expect(next.items).toHaveLength(2);
  });
});

describe("clearProgression", () => {
  it("empties items but preserves bpm/timeSignature", () => {
    const progression = setBpm(setTimeSignature(progressionOf("Cmaj7", "Am7"), "6/8"), 140);
    const next = clearProgression(progression);
    expect(next.items).toEqual([]);
    expect(next.bpm).toBe(140);
    expect(next.timeSignature).toBe("6/8");
  });
});

describe("transposeProgression", () => {
  it("transposes every chord by the given semitones using the context-aware engine", () => {
    // Product-spec worked example: +2 semitones, Cmaj7 -> Dmaj7, Am7 -> Bm7.
    const progression = progressionOf("Cmaj7", "Am7");
    const next = transposeProgression(progression, 2);
    expect(next.items.map((i) => chordSymbol(i.chord))).toEqual(["Dmaj7", "Bm7"]);
  });

  it("produces conventional enharmonic spelling, not a naive sharp-only shift", () => {
    // -1 semitone from C should spell as B, not "C" minus a fixed table entry.
    const progression = progressionOf("C");
    const next = transposeProgression(progression, -1);
    expect(chordSymbol(next.items[0].chord)).toBe("B");
  });

  it("a semitones of 0 is a no-op (same reference)", () => {
    const progression = progressionOf("Cmaj7");
    expect(transposeProgression(progression, 0)).toBe(progression);
  });

  it("preserves order, durations, ids, bpm and time signature", () => {
    const progression = setBpm(progressionOf("Cmaj7", "Am7"), 110);
    const withDuration = setItemDuration(progression, progression.items[0].id, 2);
    const next = transposeProgression(withDuration, 5);
    expect(next.items.map((i) => i.id)).toEqual(withDuration.items.map((i) => i.id));
    expect(next.items.map((i) => i.durationBeats)).toEqual([2, DEFAULT_DURATION_BEATS]);
    expect(next.bpm).toBe(110);
  });

  it("round-trips back to the original chords when transposed and un-transposed", () => {
    const progression = progressionOf("Cmaj7", "Am7", "F#dim");
    const roundTripped = transposeProgression(transposeProgression(progression, 7), -7);
    expect(roundTripped.items.map((i) => chordSymbol(i.chord))).toEqual(
      progression.items.map((i) => chordSymbol(i.chord)),
    );
  });
});
