import { describe, expect, it } from "vitest";
import { parseChordSymbol, chordSymbol } from "@/domain/chords";
import { DEFAULT_TIME_SIGNATURE } from "@/domain/progression";
import type { Progression } from "@/domain/progression";
import { buildProgressionSchedule, progressionDurationSeconds, secondsPerBeat } from "./scheduling";

let idSuffix = 0;

function emptyProgression(bpm = 90): Progression {
  return { items: [], bpm, timeSignature: DEFAULT_TIME_SIGNATURE };
}

function progressionWith(entries: [string, number][], bpm = 90): Progression {
  return {
    items: entries.map(([symbol, durationBeats]) => {
      idSuffix += 1;
      return { id: `test-item-${idSuffix}`, chord: parseChordSymbol(symbol), durationBeats };
    }),
    bpm,
    timeSignature: DEFAULT_TIME_SIGNATURE,
  };
}

describe("secondsPerBeat", () => {
  it("60 BPM is exactly 1 second per beat", () => {
    expect(secondsPerBeat(60)).toBe(1);
  });

  it("120 BPM is exactly 0.5 seconds per beat", () => {
    expect(secondsPerBeat(120)).toBe(0.5);
  });

  it("90 BPM is 2/3 of a second per beat", () => {
    expect(secondsPerBeat(90)).toBeCloseTo(0.6667, 4);
  });
});

describe("buildProgressionSchedule", () => {
  it("an empty progression schedules no events", () => {
    expect(buildProgressionSchedule(emptyProgression())).toEqual([]);
  });

  it("schedules events back-to-back in order, using durationBeats * secondsPerBeat", () => {
    // Product-spec worked example: Cmaj7(4) A7(4) Dm7(2) G7(2) at 60 BPM (1s/beat).
    const progression = progressionWith(
      [
        ["Cmaj7", 4],
        ["A7", 4],
        ["Dm7", 2],
        ["G7", 2],
      ],
      60,
    );
    const schedule = buildProgressionSchedule(progression);

    expect(schedule.map((e) => chordSymbol(e.chord))).toEqual(["Cmaj7", "A7", "Dm7", "G7"]);
    expect(schedule.map((e) => e.startSeconds)).toEqual([0, 4, 8, 10]);
    expect(schedule.map((e) => e.durationSeconds)).toEqual([4, 4, 2, 2]);
  });

  it("a faster BPM proportionally shrinks every event's timing", () => {
    const progression = progressionWith(
      [
        ["C", 4],
        ["G", 4],
      ],
      120, // 0.5s/beat
    );
    const schedule = buildProgressionSchedule(progression);
    expect(schedule.map((e) => e.startSeconds)).toEqual([0, 2]);
    expect(schedule.map((e) => e.durationSeconds)).toEqual([2, 2]);
  });

  it("time signature does NOT change beat duration (V1 convention: durationBeats is always quarter-note beats)", () => {
    const base = progressionWith(
      [
        ["C", 4],
        ["G", 4],
      ],
      90,
    );
    const in3_4 = { ...base, timeSignature: "3/4" as const };
    const in6_8 = { ...base, timeSignature: "6/8" as const };

    const scheduleBase = buildProgressionSchedule(base);
    const schedule3_4 = buildProgressionSchedule(in3_4);
    const schedule6_8 = buildProgressionSchedule(in6_8);

    expect(schedule3_4.map((e) => e.startSeconds)).toEqual(scheduleBase.map((e) => e.startSeconds));
    expect(schedule6_8.map((e) => e.startSeconds)).toEqual(scheduleBase.map((e) => e.startSeconds));
    expect(schedule3_4.map((e) => e.durationSeconds)).toEqual(
      scheduleBase.map((e) => e.durationSeconds),
    );
  });

  it("preserves each item's id for UI highlighting", () => {
    const progression = progressionWith([["C", 4]]);
    const item = progression.items[0];
    const schedule = buildProgressionSchedule(progression);
    expect(schedule[0].itemId).toBe(item.id);
  });
});

describe("progressionDurationSeconds", () => {
  it("is 0 for an empty progression", () => {
    expect(progressionDurationSeconds(emptyProgression())).toBe(0);
  });

  it("sums every item's duration in seconds", () => {
    const progression = progressionWith(
      [
        ["Cmaj7", 4],
        ["A7", 4],
        ["Dm7", 2],
        ["G7", 2],
      ],
      60,
    );
    expect(progressionDurationSeconds(progression)).toBe(12);
  });
});
