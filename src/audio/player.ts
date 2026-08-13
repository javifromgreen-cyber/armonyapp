import * as Tone from "tone";
import type { Chord } from "@/domain/chords";
import type { Progression } from "@/domain/progression";
import { neutralVoicing } from "./voicing";
import type { PlayablePitch } from "@/domain/instruments/playablePitch";
import { buildProgressionSchedule } from "./scheduling";

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
 * The NEUTRAL voice — "Hear chord" (Phase 6 §4) and progression playback
 * (Phase 6) only. Deliberately not meant to sound like any particular
 * instrument (product-spec.md §18's "neutral harmonic playback"), so it
 * stays a plain synth even after Phase R2 moved instrument-specific
 * playback to samples below.
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
type InstrumentName = "piano" | "guitar" | "bass";

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

/**
 * One-off chord preview ("Hear chord", Phase 6 §4) — purely auditory, never
 * touches application/progression state. Uses the default neutral voicing;
 * "Hear this voicing" (Phase 7 §13) uses `hearPitches` below instead, with
 * its own computed `PlayablePitch[]` rather than `neutralVoicing`.
 */
export async function hearChord(chord: Chord): Promise<void> {
  await ensureAudioReady();
  playPitches(pitchesToFrequencies(neutralVoicing(chord)), 1.1);
}

/** Seconds between successive chords in `hearPath`/`hearTransition` — enough space to actually hear each one land before the next starts (Phase R3 §25/§26/§27). */
const PATH_CHORD_GAP_SECONDS = 0.65;
const PATH_CHORD_DURATION_SECONDS = 0.55;

/**
 * Neutral harmonic playback (product-spec.md §18) of a sequence of whole
 * chords, one after another — the primitive both "Hear transition" (a
 * 2-chord sequence) and "Hear path" (the full exploration path) reuse
 * (Phase R3 §25/§27), rather than each having its own scheduling logic.
 * Deliberately simple: no voice-leading optimisation, same neutral voicing
 * `hearChord` already uses. A no-op for an empty/single-chord sequence —
 * there's nothing to sequence.
 */
export async function hearPath(chords: Chord[]): Promise<void> {
  if (chords.length < 2) return;
  await ensureAudioReady();
  const synthInstance = getSynth();
  const now = Tone.now();
  chords.forEach((chord, index) => {
    synthInstance.triggerAttackRelease(
      pitchesToFrequencies(neutralVoicing(chord)),
      PATH_CHORD_DURATION_SECONDS,
      now + index * PATH_CHORD_GAP_SECONDS,
    );
  });
}

/** "Hear transition" (Phase R3 §25/§26) — auditions a candidate move (current endpoint -> a previewed chord) before committing it to the path, without requiring the user to advance first. */
export function hearTransition(from: Chord, to: Chord): Promise<void> {
  return hearPath([from, to]);
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

/** Low-level playback primitive — assumes the AudioContext is already running; prefer `hearChord`/`hearPitches` from a click handler instead of calling this directly. */
export function playPitches(frequenciesHz: number[], durationSeconds: number, time?: number): void {
  getSynth().triggerAttackRelease(frequenciesHz, durationSeconds, time);
}

export interface PlaybackHandlers {
  /** Fired (UI-thread-synced via `Tone.Draw`) right as each chord starts sounding — drives the "currently playing" card highlight. */
  onChordStart: (itemId: string) => void;
  /** Fired when playback reaches the end of the progression on its own (not on manual Stop). */
  onFinish: () => void;
}

/**
 * Schedules and starts the whole progression on `Tone.Transport`. Guards
 * against overlapping transports itself (Phase 6 §8) by always clearing any
 * prior schedule first — repeated Play presses can never stack duplicate
 * playback. Chords never overlap: each is released ~8% early relative to
 * the next one's start, giving a clean articulation instead of pitches
 * bleeding into each other.
 */
export async function playProgression(
  progression: Progression,
  handlers: PlaybackHandlers,
): Promise<void> {
  await ensureAudioReady();
  stopProgression();

  const schedule = buildProgressionSchedule(progression);
  if (schedule.length === 0) return;

  const transport = Tone.getTransport();
  const synthInstance = getSynth();

  for (const event of schedule) {
    const soundingSeconds = event.durationSeconds * 0.92;
    transport.schedule((time) => {
      synthInstance.triggerAttackRelease(
        pitchesToFrequencies(neutralVoicing(event.chord)),
        soundingSeconds,
        time,
      );
      Tone.getDraw().schedule(() => handlers.onChordStart(event.itemId), time);
    }, event.startSeconds);
  }

  const lastEvent = schedule[schedule.length - 1];
  const endSeconds = lastEvent.startSeconds + lastEvent.durationSeconds;
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
