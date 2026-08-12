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

export interface HearPitchesOptions {
  durationSeconds?: number;
  /**
   * Seconds between each successive pitch's onset (Phase 8 §20's "subtle
   * guitar-like onset staggering") — 0 (the default) triggers every pitch
   * simultaneously, matching Phase 7's piano "Hear this voicing" exactly.
   * `pitches` should be ordered low to high for a natural downstrum.
   */
  strumDelaySeconds?: number;
}

/**
 * Plays an EXPLICIT set of pitches exactly as given (Phase 7 §13 / Phase 8
 * §19's "Hear this voicing" — the displayed piano/guitar voicing, not a
 * regenerated generic chord). The seam any instrument-specific voicing
 * hands its own `PlayablePitch[]` to, reusing this same engine rather than
 * duplicating it. A non-zero `strumDelaySeconds` staggers onsets low-to-high
 * for a light strum feel — still the exact pitches, just not simultaneous.
 */
export async function hearPitches(pitches: PlayablePitch[], options?: HearPitchesOptions): Promise<void> {
  await ensureAudioReady();
  const durationSeconds = options?.durationSeconds ?? 1.4;
  const strumDelaySeconds = options?.strumDelaySeconds ?? 0;

  if (strumDelaySeconds <= 0) {
    playPitches(pitchesToFrequencies(pitches), durationSeconds);
    return;
  }

  const synthInstance = getSynth();
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
}
