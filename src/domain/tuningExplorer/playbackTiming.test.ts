import { describe, expect, it } from "vitest";
import {
  scheduleOpenStrings,
  activeEventsAt,
  OPEN_STRING_GAP_SECONDS,
  NOTE_DURATION_SECONDS,
  type NoteTriggerEvent,
} from "./playbackTiming";

describe("scheduleOpenStrings", () => {
  it("26 — orders LOW -> HIGH, matching the storage order of openStringsMidi", () => {
    const openStringsMidi = [40, 45, 50, 55, 59, 64]; // low -> high, arbitrary but ascending
    const steps = scheduleOpenStrings(openStringsMidi);
    expect(steps.map((s) => s.midi)).toEqual(openStringsMidi);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].startSeconds).toBeGreaterThan(steps[i - 1].startSeconds);
    }
  });

  it("27 — open-string spacing is fixed and deterministic", () => {
    expect(OPEN_STRING_GAP_SECONDS).toBeGreaterThanOrEqual(0.25);
    expect(OPEN_STRING_GAP_SECONDS).toBeLessThanOrEqual(0.3);

    const steps = scheduleOpenStrings([40, 45, 50, 55]);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].startSeconds - steps[i - 1].startSeconds).toBeCloseTo(OPEN_STRING_GAP_SECONDS);
    }
  });

  it("works identically for any string count, including a 7-string configuration", () => {
    const openStringsMidi = [35, 40, 45, 50, 55, 59, 64];
    const steps = scheduleOpenStrings(openStringsMidi);
    expect(steps).toHaveLength(7);
    expect(steps[6].startSeconds).toBeCloseTo(6 * OPEN_STRING_GAP_SECONDS);
  });
});

describe("28 — independent manual notes do not cancel previous notes", () => {
  it("two notes triggered 0.3s apart both remain 'sounding' during their overlap", () => {
    const events: NoteTriggerEvent[] = [
      { id: "string5-fret0", startSeconds: 0, durationSeconds: NOTE_DURATION_SECONDS },
      { id: "string4-fret1", startSeconds: 0.3, durationSeconds: NOTE_DURATION_SECONDS },
    ];
    // At t=0.5, the first note (ends at 1.0) and the second (started at 0.3) are BOTH active.
    const active = activeEventsAt(events, 0.5);
    expect(active.map((e) => e.id).sort()).toEqual(["string4-fret1", "string5-fret0"]);
  });

  it("a note stops being active once its own duration has elapsed, independent of others", () => {
    const events: NoteTriggerEvent[] = [
      { id: "first", startSeconds: 0, durationSeconds: 1.0 },
      { id: "second", startSeconds: 0.3, durationSeconds: 1.0 },
    ];
    const active = activeEventsAt(events, 1.1); // first has ended (0-1.0), second is still sounding (0.3-1.3)
    expect(active.map((e) => e.id)).toEqual(["second"]);
  });

  it("retriggering the same position restarts its own active window independently", () => {
    const events: NoteTriggerEvent[] = [
      { id: "string6-fret0", startSeconds: 0, durationSeconds: 1.0 },
      { id: "string6-fret0", startSeconds: 0.5, durationSeconds: 1.0 },
    ];
    // The retrigger's own window (0.5-1.5) still contains t=1.2, proving a
    // fresh click extends the active window rather than the first one's
    // (0-1.0, which would have already ended by t=1.2).
    const active = activeEventsAt(events, 1.2);
    expect(active).toHaveLength(1);
    expect(active[0].startSeconds).toBe(0.5);
  });
});
