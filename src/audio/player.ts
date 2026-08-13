import * as Tone from "tone";
import type { Chord } from "@/domain/chords";
import type { Progression } from "@/domain/progression";
import type { InstrumentName } from "@/domain/instruments";
import type { PlayablePitch } from "@/domain/instruments/playablePitch";
import { representativePitchesFor, representativeBassSteps } from "./instrumentVoicing";

/**
 * Thin Tone.js adapter — the ONLY file in `src/audio` that imports Tone.js.
 * Everything musically meaningful (voicing, scheduling math) lives in pure,
 * Tone-free sibling modules and is unit-tested there; this file just wires
 * that data to the Web Audio API via `Tone.Transport`/`PolySynth`, never a
 * `setTimeout` chain (Phase 6 §2 — raw timers drift against the audio
 * clock and can't sample-accurately align with other scheduled events).
 */

/** A user-friendly, translatable error — never leak a raw Tone.js/Web Audio error to the UI (Phase 6 §15). */
export class AudioInitError extends Error {
  constructor(cause: unknown) {
    super("Audio playback could not be started.");
    this.name = "AudioInitError";
    this.cause = cause;
  }
}

let synth: Tone.PolySynth<Tone.Synth> | null = null;

/**
 * The NEUTRAL voice. Since Phase R3.3, "Hear this chord only", map/path
 * audition, and progression playback are all instrument-aware (§9/§39/§71-
 * 72) and no longer use this — it survives only as `hearPitches`'s
 * `voice: "default"` fallback (kept for API completeness; no current caller
 * passes it). Deliberately not meant to sound like any particular
 * instrument (product-spec.md §18's original "neutral harmonic playback"
 * framing), so it stays a plain synth even after Phase R2 moved
 * instrument-specific playback to samples below.
 */
function getSynth(): Tone.PolySynth<Tone.Synth> {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.35, release: 0.5 },
    }).toDestination();
  }
  return synth;
}

/**
 * Real per-instrument identity for "Hear this voicing"/"Hear this pattern"
 * (Phase R2). A synth-only approach (tried in Phases 8/9 — an oscillator
 * type + envelope tweak per instrument) was evaluated honestly against real
 * listening feedback and found insufficient: Piano and Guitar stayed too
 * similar, and no oscillator/envelope combination gave Bass a convincing
 * fingerstyle-electric-bass identity (it read as a short, artificial,
 * synth/fretless-like tone). This moves instrument playback to a small,
 * lazily-loaded sample set per instrument via `Tone.Sampler`
 * (repitches from a sparse set of recorded notes — not a full 88-key
 * multisample — so asset size stays small: ~150–250KB per instrument,
 * loaded only the first time that instrument's "Hear this voicing/pattern"
 * fires, cached in `instrumentVoices` for the rest of the session).
 *
 * Samples: General MIDI "FluidR3_GM" soundfont, rendered to MP3 by the
 * `gleitz/midi-js-soundfonts` project (https://github.com/gleitz/midi-js-soundfonts),
 * licensed CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/us/) —
 * see `docs/audio-credits.md` for the full attribution this license
 * requires. Instruments used: `acoustic_grand_piano`, `acoustic_guitar_steel`,
 * `electric_bass_finger` (a genuine fingerstyle-bass recording, directly
 * answering the "not synth/fretless/slap" requirement). Files live in
 * `public/audio/{piano,guitar,bass}/`, served from this app's own domain
 * (never hotlinked from a third party at runtime).
 */
interface SampleMap {
  baseUrl: string;
  urls: Record<string, string>;
  /** Seconds of release tail (Phase R2 §17/§19: real sustain, not an abruptly cut-off note) — tuned per instrument since Bass in particular needs longer natural sustain than Piano/Guitar. */
  release: number;
}

const SAMPLE_MAPS: Record<InstrumentName, SampleMap> = {
  piano: {
    baseUrl: "/audio/piano/",
    urls: {
      C4: "C4.mp3",
      E4: "E4.mp3",
      Ab4: "Ab4.mp3",
      C5: "C5.mp3",
      E5: "E5.mp3",
      Ab5: "Ab5.mp3",
      C6: "C6.mp3",
      E6: "E6.mp3",
      Ab6: "Ab6.mp3",
      C7: "C7.mp3",
    },
    release: 1.2,
  },
  guitar: {
    baseUrl: "/audio/guitar/",
    urls: {
      E2: "E2.mp3",
      Ab2: "Ab2.mp3",
      C3: "C3.mp3",
      E3: "E3.mp3",
      Ab3: "Ab3.mp3",
      C4: "C4.mp3",
      E4: "E4.mp3",
      Ab4: "Ab4.mp3",
      C5: "C5.mp3",
      E5: "E5.mp3",
    },
    release: 1.0,
  },
  bass: {
    baseUrl: "/audio/bass/",
    urls: {
      E1: "E1.mp3",
      Ab1: "Ab1.mp3",
      C2: "C2.mp3",
      E2: "E2.mp3",
      Ab2: "Ab2.mp3",
      C3: "C3.mp3",
      E3: "E3.mp3",
      Ab3: "Ab3.mp3",
    },
    release: 1.4,
  },
};

/** Structural subset both `Tone.PolySynth` and `Tone.Sampler` satisfy — lets `hearPitches` below call either without caring which. */
interface TriggerableVoice {
  triggerAttackRelease(notes: number[] | number, duration: number, time?: number): this;
  releaseAll(time?: number): this;
}

interface InstrumentVoice {
  sampler: Tone.Sampler;
  /** Resolves once every sample for this instrument has loaded — awaited before the first note ever plays (Phase R2 §22: lazy-load, never block anything until this instrument is actually used). */
  ready: Promise<void>;
}

const instrumentVoices = new Map<InstrumentName, InstrumentVoice>();

/** Creates and starts loading an instrument's sampler on first use only; returns the same cached instance (and already-resolved `ready`) on every later call this session (Phase R2 §22's per-session caching). */
function getInstrumentVoice(instrument: InstrumentName): InstrumentVoice {
  const existing = instrumentVoices.get(instrument);
  if (existing) return existing;

  const map = SAMPLE_MAPS[instrument];
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const sampler = new Tone.Sampler({
    urls: map.urls,
    baseUrl: map.baseUrl,
    release: map.release,
    onload: () => resolveReady(),
  }).toDestination();

  const voice: InstrumentVoice = { sampler, ready };
  instrumentVoices.set(instrument, voice);
  return voice;
}

/**
 * Resumes/creates the shared AudioContext. Browsers require this to happen
 * synchronously within a genuine user gesture (Phase 6 §3) — every exported
 * function here that produces sound calls this first, and every one of
 * those functions is only ever invoked from a click handler, never on
 * mount/autoplay.
 */
async function ensureAudioReady(): Promise<void> {
  try {
    await Tone.start();
  } catch (cause) {
    throw new AudioInitError(cause);
  }
}

function pitchesToFrequencies(pitches: PlayablePitch[]): number[] {
  return pitches.map((pitch) => pitch.frequencyHz);
}

/** How long a single note/chord sounds for the isolated "Hear this chord only" preview. */
const HEAR_CHORD_DURATION_SECONDS = 1.1;

/**
 * One-off chord preview ("Hear this chord only", Phase 6 §4, instrument-
 * aware since Phase R3.3 §71-72): purely auditory, never touches
 * application/progression/navigation state. Uses `instrument`'s own
 * representative voicing/pattern (Phase R3.3 §10/§11) through its real
 * sampler — coherent with whatever the rest of the UI (toolbar selector,
 * right panel) is currently showing, rather than a generic neutral synth
 * that would contradict a visibly-selected Guitar/Bass. Distinct from
 * "Hear this voicing"/"Hear this pattern" (Phase 7 §13 / Phase 9 §23),
 * which uses `hearPitches` below with the EXACT displayed voicing/pattern
 * rather than this function's representative default.
 */
export async function hearChord(chord: Chord, instrument: InstrumentName): Promise<void> {
  await ensureAudioReady();
  const voice = getInstrumentVoice(instrument);
  await voice.ready;

  if (instrument === "bass") {
    const steps = representativeBassSteps(chord);
    const stepGap = HEAR_CHORD_DURATION_SECONDS / steps.length;
    const now = Tone.now();
    steps.forEach((pitch, index) => {
      voice.sampler.triggerAttackRelease(pitch.frequencyHz, stepGap * 0.85, now + index * stepGap);
    });
    return;
  }

  const pitches = representativePitchesFor(chord, instrument);
  voice.sampler.triggerAttackRelease(pitchesToFrequencies(pitches), HEAR_CHORD_DURATION_SECONDS);
}

/** Seconds between successive chords in `hearPath` — enough space to actually hear each one land, but concise since this fires on every preview/confirm/Back/replay click (Phase R3.2 §28: exploring must stay quick, never a "long performance"). */
const PATH_CHORD_GAP_SECONDS = 0.5;
const PATH_CHORD_DURATION_SECONDS = 0.42;

/**
 * Schedules one chord's worth of audition inside `hearPath`/`playProgression`,
 * starting at `slotStartSeconds` and (for Piano/Guitar) sounding for
 * `slotDurationSeconds`. Bass is handled distinctly (Phase R3.3 §14): it
 * plays `representativeBassSteps`' short note SEQUENCE spread evenly across
 * the slot rather than one simultaneous block chord — Bass stays a
 * melodic, sequential instrument even in cumulative path audition, never
 * "converted into simultaneous Piano-style chords".
 */
function scheduleInstrumentChord(
  transport: ReturnType<typeof Tone.getTransport>,
  sampler: Tone.Sampler,
  chord: Chord,
  instrument: InstrumentName,
  slotStartSeconds: number,
  slotDurationSeconds: number,
  onSounded?: (time: number) => void,
): void {
  if (instrument === "bass") {
    const steps = representativeBassSteps(chord);
    const stepGapSeconds = slotDurationSeconds / steps.length;
    steps.forEach((pitch, index) => {
      transport.schedule((time) => {
        sampler.triggerAttackRelease(pitch.frequencyHz, stepGapSeconds * 0.85, time);
        if (index === 0) onSounded?.(time);
      }, slotStartSeconds + index * stepGapSeconds);
    });
    return;
  }

  const pitches = representativePitchesFor(chord, instrument);
  transport.schedule((time) => {
    sampler.triggerAttackRelease(pitchesToFrequencies(pitches), slotDurationSeconds, time);
    onSounded?.(time);
  }, slotStartSeconds);
}

/**
 * Instrument-aware playback (Phase R3.3 §9/§13/§17-19, superseding R3.2's
 * neutral-synth version) of the CUMULATIVE exploration path — the confirmed
 * navigation history plus (while one is active) the previewed candidate,
 * always replayed from its first chord (Phase R3.2 §14/§18/§21: "does this
 * whole route work?", not just the newest link) — now through
 * `instrument`'s real sampler and representative voicing/pattern rather
 * than a generic neutral synth (Phase R3.3 §9/§10). The single primitive
 * every audition case reuses: previewing a candidate, Back's shortened
 * path, and replaying the confirmed path from the current/center chord —
 * never separate scheduling logic per case. A no-op only for a genuinely
 * empty sequence — a single chord (e.g. Back all the way down to the
 * starting chord, or replaying a not-yet-advanced path) still plays that
 * one chord.
 *
 * Scheduled on `Tone.Transport` (the same mechanism `playProgression`
 * already uses) rather than raw `Tone.now()`-relative offsets, and always
 * starts by calling `stopProgression()` — this is what makes switching to a
 * new preview candidate (or any other new audition) actually cancel
 * whatever was still pending (Phase R3.2 §15, preserved unchanged in
 * R3.3 §19): a `Tone.now()`-relative `triggerAttackRelease` call, once
 * scheduled, cannot be un-scheduled, but `Transport.cancel()` (part of
 * `stopProgression`) clears everything still pending. Reuses the existing
 * playback-cancellation architecture rather than inventing a second one.
 */
export async function hearPath(chords: Chord[], instrument: InstrumentName): Promise<void> {
  if (chords.length === 0) return;
  await ensureAudioReady();
  stopProgression();

  const voice = getInstrumentVoice(instrument);
  await voice.ready;

  const transport = Tone.getTransport();
  chords.forEach((chord, index) => {
    scheduleInstrumentChord(
      transport,
      voice.sampler,
      chord,
      instrument,
      index * PATH_CHORD_GAP_SECONDS,
      PATH_CHORD_DURATION_SECONDS,
    );
  });

  const totalSeconds = (chords.length - 1) * PATH_CHORD_GAP_SECONDS + PATH_CHORD_DURATION_SECONDS;
  transport.schedule(() => transport.stop(), totalSeconds);
  transport.start();
}

export interface HearPitchesOptions {
  durationSeconds?: number;
  /**
   * Seconds between each successive pitch's onset — 0 (the default)
   * triggers every pitch simultaneously, matching Phase 7's piano "Hear
   * this voicing" exactly. A small value (Phase 8 §20) gives a light
   * guitar-like strum stagger; a value tied to the current BPM (Phase 9
   * §24) turns this into genuine sequential bass-pattern playback — same
   * primitive, different timing, never a second playback engine.
   * `pitches` should be ordered the way they're meant to be heard.
   */
  strumDelaySeconds?: number;
  /** "default" (the neutral synth) or a real instrument voice (Phase R2) — omit for "default". */
  voice?: "default" | InstrumentName;
}

/**
 * Plays an EXPLICIT set of pitches exactly as given (Phase 7 §13 / Phase 8
 * §19's "Hear this voicing" / Phase 9 §23's "Hear this pattern" — the
 * displayed piano/guitar voicing or bass pattern, not a regenerated
 * generic chord). The seam any instrument-specific voicing/pattern hands
 * its own `PlayablePitch[]` to, reusing this same engine rather than
 * duplicating it. A non-zero `strumDelaySeconds` staggers onsets — small
 * for a light guitar strum, one beat's worth for a bass pattern played
 * strictly in sequence — still the exact pitches, just not simultaneous.
 * When `voice` names a real instrument, this awaits that instrument's
 * sample set (lazy-loaded on first use, cached after) before triggering —
 * exact pitch/octave is preserved either way since `Tone.Sampler` repitches
 * by frequency, the same `pitch.frequencyHz` this always played.
 */
export async function hearPitches(pitches: PlayablePitch[], options?: HearPitchesOptions): Promise<void> {
  await ensureAudioReady();
  const durationSeconds = options?.durationSeconds ?? 1.4;
  const strumDelaySeconds = options?.strumDelaySeconds ?? 0;

  let synthInstance: TriggerableVoice;
  if (options?.voice && options.voice !== "default") {
    const voice = getInstrumentVoice(options.voice);
    await voice.ready;
    synthInstance = voice.sampler;
  } else {
    synthInstance = getSynth();
  }

  if (strumDelaySeconds <= 0) {
    synthInstance.triggerAttackRelease(pitchesToFrequencies(pitches), durationSeconds);
    return;
  }

  const now = Tone.now();
  pitches.forEach((pitch, index) => {
    synthInstance.triggerAttackRelease(pitch.frequencyHz, durationSeconds, now + index * strumDelaySeconds);
  });
}

export interface PlaybackHandlers {
  /** Fired (UI-thread-synced via `Tone.Draw`) right as each chord starts sounding — drives the "currently playing" card highlight. */
  onChordStart: (itemId: string) => void;
  /** Fired when playback reaches the end of the progression on its own (not on manual Stop). */
  onFinish: () => void;
}

/**
 * Schedules and starts the whole progression on `Tone.Transport`, through
 * `instrument`'s real sampler and representative voicing/pattern (Phase
 * R3.3 §39: one coherent audition instrument across map preview, Hear Path,
 * current-path replay, AND progression playback — never a contradictory
 * state where the map says Guitar but the progression plays an unrelated
 * neutral sound). Guards against overlapping transports itself (Phase 6 §8)
 * by always clearing any prior schedule first — repeated Play presses can
 * never stack duplicate playback.
 *
 * Phase R3.4: uses the SAME simple, deterministic, fixed per-chord pacing
 * as `hearPath` (`PATH_CHORD_GAP_SECONDS`/`PATH_CHORD_DURATION_SECONDS`)
 * rather than BPM/time-signature/per-item-duration math — Armony's
 * progression is a quick harmonic-route audition, not a rhythmic
 * composition, so there is deliberately no tempo intelligence here (see
 * `docs/product-spec.md` §16/§18's R3.4 revision). This is now, by design,
 * the same underlying timing "Hear Path" uses on the exact same confirmed
 * chords (`progression.items` IS the confirmed path, Phase R3.3) — the two
 * controls remain because they serve different UI contexts (a quick replay
 * anchored to the map vs. a Play/Stop control with per-chord highlighting
 * on the visible progression strip), not because they behave differently
 * musically.
 */
export async function playProgression(
  progression: Progression,
  instrument: InstrumentName,
  handlers: PlaybackHandlers,
): Promise<void> {
  await ensureAudioReady();
  stopProgression();

  const items = progression.items;
  if (items.length === 0) return;

  const voice = getInstrumentVoice(instrument);
  await voice.ready;

  const transport = Tone.getTransport();

  items.forEach((item, index) => {
    scheduleInstrumentChord(
      transport,
      voice.sampler,
      item.chord,
      instrument,
      index * PATH_CHORD_GAP_SECONDS,
      PATH_CHORD_DURATION_SECONDS,
      (time) => Tone.getDraw().schedule(() => handlers.onChordStart(item.id), time),
    );
  });

  const endSeconds = (items.length - 1) * PATH_CHORD_GAP_SECONDS + PATH_CHORD_DURATION_SECONDS;
  transport.schedule((time) => {
    Tone.getDraw().schedule(() => handlers.onFinish(), time);
    transport.stop();
  }, endSeconds);

  transport.start();
}

/** Cancels every scheduled event and silences any currently-sounding voices — safe to call even when nothing is playing. */
export function stopProgression(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(); // clears every scheduled event
  synth?.releaseAll();
  for (const voice of instrumentVoices.values()) voice.sampler.releaseAll();
}
