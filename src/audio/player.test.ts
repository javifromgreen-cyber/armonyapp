import { describe, it, expect, vi, type Mock } from "vitest";
import type { PlayablePitch } from "@/domain/instruments/playablePitch";

/**
 * `player.ts` is the one file that touches Tone.js directly, so it can't be
 * exercised with a real AudioContext in Vitest (no browser here) — that's
 * exactly why the musically-meaningful math lives in Tone-free siblings
 * (`pitch`/`scheduling`/`voicing.ts`), tested separately. What THIS file
 * verifies instead (Phase R2 §23, extended R3.3 §9/§71-72) is the ROUTING
 * and TIMING behavior around Tone.js: which instrument's voice gets
 * triggered for which `voice`/instrument argument (including "Hear this
 * chord only", map/path audition, and progression playback all routing to
 * the globally selected instrument's real sampler rather than a neutral
 * synth), that staggered (strum/sequential) playback preserves pitch order
 * and timing, and that the exact frequency values passed through are never
 * altered. Achieved by
 * mocking the `tone` module with small recording fakes standing in for
 * `PolySynth`/`Sampler` — this tests player.ts's own logic, not Tone.js
 * itself or real audio output.
 */
vi.mock("tone", () => {
  class FakeVoice {
    calls: { method: string; args: unknown[] }[] = [];
    toDestination() {
      return this;
    }
    triggerAttackRelease(...args: unknown[]) {
      this.calls.push({ method: "triggerAttackRelease", args });
      return this;
    }
    releaseAll(...args: unknown[]) {
      this.calls.push({ method: "releaseAll", args });
      return this;
    }
  }

  class PolySynth extends FakeVoice {
    static instances: PolySynth[] = [];
    constructor() {
      super();
      PolySynth.instances.push(this);
    }
  }

  class Sampler extends FakeVoice {
    static instances: Sampler[] = [];
    options: { baseUrl?: string; onload?: () => void };
    constructor(options: { baseUrl?: string; onload?: () => void }) {
      super();
      this.options = options;
      Sampler.instances.push(this);
      if (options?.onload) Promise.resolve().then(() => options.onload!());
    }
  }

  // A single shared transport mock per module instance (not a fresh object
  // per `getTransport()` call) — real `Tone.getTransport()` always returns
  // the same underlying transport, and cancellation tests (Phase R3.1 §33)
  // need to observe `cancel()`/`schedule()` calls made from WITHIN
  // player.ts's own logic, not just from test code calling it separately.
  const transportMock = {
    schedule: vi.fn((callback: (time: number) => void, time: number) => {
      transportMock.scheduled.push({ callback, time });
    }),
    scheduled: [] as { callback: (time: number) => void; time: number }[],
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(() => {
      transportMock.scheduled = [];
    }),
  };

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn(() => 0),
    PolySynth,
    Sampler,
    Synth: class {},
    getTransport: () => transportMock,
    getDraw: () => ({ schedule: (cb: () => void) => cb() }),
  };
});

function pitch(frequencyHz: number): PlayablePitch {
  return { note: { letter: "C", accidental: 0 }, octave: 4, midi: 60, frequencyHz };
}

// Fresh module + fresh fake-Tone instance tracking per test, so "was a new
// Sampler constructed" assertions never leak state between tests.
interface FakeVoiceLike {
  calls: { method: string; args: unknown[] }[];
}

interface TransportMock {
  schedule: Mock;
  scheduled: { callback: (time: number) => void; time: number }[];
  start: Mock;
  stop: Mock;
  cancel: Mock;
}

// Fresh module + fresh fake-Tone instance/transport tracking per test — the
// "tone" mock module itself is only evaluated once per test file (its
// factory doesn't re-run on `vi.resetModules()`), so every piece of
// recorded state (constructed instances, transport mock call history) must
// be manually cleared here, mirroring the existing PolySynth/Sampler reset.
async function freshPlayer() {
  vi.resetModules();
  const Tone = (await import("tone")) as unknown as {
    PolySynth: { instances: FakeVoiceLike[] };
    Sampler: { instances: (FakeVoiceLike & { options: { baseUrl?: string } })[] };
    getTransport: () => TransportMock;
  };
  Tone.PolySynth.instances = [];
  Tone.Sampler.instances = [];
  const transport = Tone.getTransport();
  transport.schedule.mockClear();
  transport.start.mockClear();
  transport.stop.mockClear();
  transport.cancel.mockClear();
  transport.scheduled = [];
  const player = await import("./player");
  return { player, Tone };
}

/** Simulates the transport actually reaching each currently-scheduled event's time — the mock's `schedule()` only records events, it doesn't fire them on its own. */
function flushTransport(Tone: { getTransport: () => TransportMock }) {
  const transport = Tone.getTransport();
  const pending = [...transport.scheduled];
  transport.scheduled = [];
  pending.forEach(({ callback, time }) => callback(time));
}

describe("hearPitches — instrument routing (Phase R2 §23)", () => {
  it("voice: 'piano' triggers a Sampler loaded from the piano sample set", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "piano" });
    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("piano");
    expect(Tone.PolySynth.instances).toHaveLength(0);
  });

  it("voice: 'guitar' triggers a Sampler loaded from the guitar sample set", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "guitar" });
    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("guitar");
  });

  it("voice: 'bass' triggers a Sampler loaded from the bass sample set", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(110)], { voice: "bass" });
    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("bass");
  });

  it("piano/guitar/bass each load a genuinely separate Sampler instance", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "piano" });
    await player.hearPitches([pitch(440)], { voice: "guitar" });
    await player.hearPitches([pitch(440)], { voice: "bass" });
    expect(Tone.Sampler.instances).toHaveLength(3);
    const baseUrls = Tone.Sampler.instances.map((s) => s.options.baseUrl);
    expect(new Set(baseUrls).size).toBe(3); // all different
  });

  it("reuses the same Sampler instance across repeated calls for the same instrument (session cache)", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "piano" });
    await player.hearPitches([pitch(550)], { voice: "piano" });
    await player.hearPitches([pitch(660)], { voice: "piano" });
    expect(Tone.Sampler.instances).toHaveLength(1); // only ever constructed once
  });

  it("omitting voice (or voice: 'default') never touches any Sampler — uses the neutral synth", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)]);
    await player.hearPitches([pitch(440)], { voice: "default" });
    expect(Tone.Sampler.instances).toHaveLength(0);
    expect(Tone.PolySynth.instances).toHaveLength(1); // the shared neutral synth, created once
  });
});

describe("hearChord — instrument-aware, coherent with the global selector (Phase R3.3 §71-72)", () => {
  it("uses the selected instrument's Sampler, never the neutral synth", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearChord(parseChordSymbol("Cmaj7"), "piano");
    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("piano");
    expect(Tone.PolySynth.instances).toHaveLength(0);
  });

  it("switching the instrument between calls loads/uses a genuinely different sampler", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearChord(parseChordSymbol("C"), "piano");
    await player.hearChord(parseChordSymbol("C"), "guitar");
    expect(Tone.Sampler.instances).toHaveLength(2);
    const baseUrls = Tone.Sampler.instances.map((s) => s.options.baseUrl);
    expect(baseUrls[0]).toContain("piano");
    expect(baseUrls[1]).toContain("guitar");
  });

  it("Bass plays a short sequential excerpt (never one simultaneous block chord, §14/§71)", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearChord(parseChordSymbol("C"), "bass");
    const sampler = Tone.Sampler.instances[0];
    expect(sampler.options.baseUrl).toContain("bass");
    const noteCalls = sampler.calls.filter((c) => c.method === "triggerAttackRelease");
    // 2 short sequential single-note calls, not 1 simultaneous chord call.
    expect(noteCalls).toHaveLength(2);
    noteCalls.forEach((call) => {
      const [freq] = call.args as [number, number, number];
      expect(typeof freq).toBe("number"); // a single pitch per call, not an array/chord
    });
  });

  it("Piano plays one simultaneous block-chord call", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearChord(parseChordSymbol("Cmaj7"), "piano");
    const sampler = Tone.Sampler.instances[0];
    const noteCalls = sampler.calls.filter((c) => c.method === "triggerAttackRelease");
    expect(noteCalls).toHaveLength(1);
    const [freqs] = noteCalls[0].args as [number[], number];
    expect(Array.isArray(freqs)).toBe(true);
  });
});

describe("hearPitches — staggered playback order and timing (Guitar strum / Bass sequence, Phase R2 §23)", () => {
  it("with strumDelaySeconds, triggers one call per pitch, in the given order, at increasing times", async () => {
    const { player, Tone } = await freshPlayer();
    const pitches = [pitch(220), pitch(277), pitch(330), pitch(440)]; // e.g. a guitar voicing low to high
    await player.hearPitches(pitches, { voice: "guitar", strumDelaySeconds: 0.02, durationSeconds: 1 });

    const sampler = Tone.Sampler.instances[0];
    expect(sampler.calls).toHaveLength(4);
    sampler.calls.forEach((call, index) => {
      const [freq, , time] = call.args as [number, number, number];
      expect(freq).toBe(pitches[index].frequencyHz); // exact pitch preserved, in order
      expect(time).toBeCloseTo(index * 0.02, 10);
    });
  });

  it("Bass sequential playback (a full beat's delay) preserves step order and exact pitches — never simultaneous", async () => {
    const { player, Tone } = await freshPlayer();
    const bpm = 90;
    const stepSeconds = 60 / bpm;
    const steps = [pitch(82.4), pitch(110), pitch(146.8), pitch(196)]; // e.g. E-A-D-G open strings ascending
    await player.hearPitches(steps, {
      voice: "bass",
      strumDelaySeconds: stepSeconds,
      durationSeconds: stepSeconds * 0.85,
    });

    const sampler = Tone.Sampler.instances[0];
    expect(sampler.calls).toHaveLength(4);
    const times = sampler.calls.map((c) => (c.args as [number, number, number])[2]);
    // strictly increasing — every step genuinely later than the previous, never simultaneous
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
    sampler.calls.forEach((call, index) => {
      const [freq] = call.args as [number, number, number];
      expect(freq).toBe(steps[index].frequencyHz);
    });
  });

  it("without strumDelaySeconds, plays every pitch in a single simultaneous call (Piano-style)", async () => {
    const { player, Tone } = await freshPlayer();
    const pitches = [pitch(261.63), pitch(329.63), pitch(392), pitch(493.88)];
    await player.hearPitches(pitches, { voice: "piano" });

    const sampler = Tone.Sampler.instances[0];
    expect(sampler.calls).toHaveLength(1);
    const [freqs] = sampler.calls[0].args as [number[], number];
    expect(freqs).toEqual(pitches.map((p) => p.frequencyHz)); // exact pitches, no MIDI/frequency regression
  });
});

describe("hearPath — cumulative exploration-path playback (Phase R3.2 §14/§18/§21, instrument-aware since R3.3 §9)", () => {
  it("schedules one Transport event per chord, in order, at increasing times, on the selected instrument's sampler", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearPath(
      [parseChordSymbol("C"), parseChordSymbol("Am"), parseChordSymbol("Dm")],
      "piano",
    );

    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("piano");
    expect(Tone.PolySynth.instances).toHaveLength(0); // never the neutral voice
    flushTransport(Tone);
    const calls = Tone.Sampler.instances[0].calls.filter((c) => c.method === "triggerAttackRelease");
    expect(calls).toHaveLength(3);
    for (let i = 1; i < calls.length; i++) {
      const prevTime = (calls[i - 1].args as [number[], number, number])[2];
      const time = (calls[i].args as [number[], number, number])[2];
      expect(time).toBeGreaterThan(prevTime);
    }
  });

  it("is a no-op only for a genuinely empty sequence", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPath([], "piano");
    expect(Tone.Sampler.instances).toHaveLength(0);
  });

  it("a single chord still plays (Back down to the starting chord, or replaying a not-yet-advanced path)", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearPath([parseChordSymbol("C")], "piano");
    flushTransport(Tone);
    const calls = Tone.Sampler.instances[0].calls.filter((c) => c.method === "triggerAttackRelease");
    expect(calls).toHaveLength(1);
  });

  it("replays the FULL path from the beginning every time, not just the newest chord (§21)", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    // confirmed C -> F -> Am, previewing Dm: the whole route sounds, not just Am -> Dm.
    await player.hearPath(
      ["C", "F", "Am", "Dm"].map((s) => parseChordSymbol(s)),
      "piano",
    );
    flushTransport(Tone);
    const calls = Tone.Sampler.instances[0].calls.filter((c) => c.method === "triggerAttackRelease");
    expect(calls).toHaveLength(4);
  });

  it("mandatory audio-interruption test (Phase R3.2 §15, preserved R3.3 §19): switching preview candidates cancels the previous audition, only the new one plays", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    const confirmed = ["C", "F", "Am"].map((s) => parseChordSymbol(s));

    // Preview Dm: confirmed + Dm begins (4 note events + 1 auto-stop, doesn't fire yet).
    await player.hearPath([...confirmed, parseChordSymbol("Dm")], "piano");
    const transport = Tone.getTransport();
    expect(transport.scheduled).toHaveLength(5);

    // Before that finishes, switch preview to E7 — confirmed history is unchanged.
    await player.hearPath([...confirmed, parseChordSymbol("E7")], "piano");

    // The Dm preview's still-pending events must have been cancelled — cancel()
    // fired once per hearPath call, and the pending queue now holds only the
    // fresh confirmed+E7 audition's 5 events, never Dm's leftover ones (which
    // would make this 10 if cancellation weren't actually clearing the queue).
    expect(transport.cancel).toHaveBeenCalledTimes(2);
    expect(transport.scheduled).toHaveLength(5);

    flushTransport(Tone);
    // The second stopProgression() also released the still-sounding prior
    // audition (a real, separate `releaseAll` call) — filter to just the
    // note triggers to check what actually sounded.
    const noteCalls = Tone.Sampler.instances[0].calls.filter(
      (c) => c.method === "triggerAttackRelease",
    );
    // Only C -> F -> Am -> E7 actually sounds (4 chords) — Dm's would-be 4th
    // call (C -> F -> Am -> Dm) never fires, proving it was cancelled rather
    // than merely superseded by a 5th trailing call.
    expect(noteCalls).toHaveLength(4);
  });

  it("hearPath also cancels an in-flight progression/instrument voice via stopProgression (no overlapping audio sources)", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "piano" });
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearPath([parseChordSymbol("C"), parseChordSymbol("G")], "piano");

    const pianoSampler = Tone.Sampler.instances[0];
    expect(pianoSampler.calls.some((c) => c.method === "releaseAll")).toBe(true);
  });

  it("Bass plays a short sequential excerpt per chord, never a simultaneous block chord (§14)", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearPath([parseChordSymbol("C"), parseChordSymbol("F")], "bass");
    flushTransport(Tone);
    const noteCalls = Tone.Sampler.instances[0].calls.filter((c) => c.method === "triggerAttackRelease");
    // 2 chords x 2 short notes each = 4 single-pitch calls, never a 2-call
    // (one simultaneous chord per step) sequence like Piano/Guitar.
    expect(noteCalls).toHaveLength(4);
    noteCalls.forEach((call) => {
      const [freq] = call.args as [number, number, number];
      expect(typeof freq).toBe("number");
    });
  });

  it("switching the instrument uses a genuinely different sampler for the next audition", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    await player.hearPath([parseChordSymbol("C")], "piano");
    await player.hearPath([parseChordSymbol("C")], "guitar");
    expect(Tone.Sampler.instances).toHaveLength(2);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("piano");
    expect(Tone.Sampler.instances[1].options.baseUrl).toContain("guitar");
  });
});

describe("playProgression — instrument-aware (Phase R3.3 §39)", () => {
  it("uses the selected instrument's sampler, never the neutral synth", async () => {
    const { player, Tone } = await freshPlayer();
    const { parseChordSymbol } = await import("@/domain/chords");
    const progression = {
      items: [
        { id: "1", chord: parseChordSymbol("C"), durationBeats: 4 },
        { id: "2", chord: parseChordSymbol("G"), durationBeats: 4 },
      ],
      bpm: 90,
      timeSignature: "4/4" as const,
    };
    await player.playProgression(progression, "guitar", { onChordStart: () => {}, onFinish: () => {} });
    expect(Tone.Sampler.instances).toHaveLength(1);
    expect(Tone.Sampler.instances[0].options.baseUrl).toContain("guitar");
    expect(Tone.PolySynth.instances).toHaveLength(0);
    flushTransport(Tone);
    const calls = Tone.Sampler.instances[0].calls.filter((c) => c.method === "triggerAttackRelease");
    expect(calls).toHaveLength(2);
  });
});

describe("stopProgression — releases every voice, including instrument samplers", () => {
  it("calls releaseAll on the neutral synth and any instrument samplers that were used", async () => {
    const { player, Tone } = await freshPlayer();
    await player.hearPitches([pitch(440)], { voice: "piano" });
    await player.hearPitches([pitch(440)], { voice: "bass" });
    player.stopProgression();

    const pianoSampler = Tone.Sampler.instances.find((s) => s.options.baseUrl?.includes("piano"))!;
    const bassSampler = Tone.Sampler.instances.find((s) => s.options.baseUrl?.includes("bass"))!;
    expect(pianoSampler.calls.some((c) => c.method === "releaseAll")).toBe(true);
    expect(bassSampler.calls.some((c) => c.method === "releaseAll")).toBe(true);
  });

  it("is safe to call when no instrument voice has ever been used", async () => {
    const { player } = await freshPlayer();
    expect(() => player.stopProgression()).not.toThrow();
  });
});
