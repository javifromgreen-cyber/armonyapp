import * as Tone from "tone";
import { frequencyFromMidi } from "@/domain/instruments/playablePitch";
import {
  scheduleOpenStrings,
  NOTE_DURATION_SECONDS,
  type TuningExplorerInstrument,
} from "@/domain/tuningExplorer";

/**
 * Tuning Explorer's OWN, isolated Tone.js wiring (product spec §18) — a
 * deliberate sibling to `src/audio/player.ts`, not a shared module.
 * Armony's `getInstrumentVoice`/`instrumentVoices` cache/`ensureAudioReady`
 * are intentionally NOT imported or reused here, even though the pattern is
 * similar: this file's own module-level state must never be touched by
 * Armony's playback (or vice versa), and the electric-guitar signal chain
 * below (distortion/EQ/compression) only belongs to THIS instrument, never
 * Armony's clean acoustic guitar sound.
 *
 * Samples: reuses the SAME licensed local files Armony already ships
 * (`public/audio/guitar/*.mp3` = `acoustic_guitar_steel`,
 * `public/audio/bass/*.mp3` = `electric_bass_finger` — see
 * `docs/audio-credits.md`), never a new download. Acoustic Guitar and Bass
 * play those samples directly/clean. Electric Guitar reuses the exact same
 * guitar samples but through an isolated distortion chain (product spec
 * §18 explicitly allows this when no distorted-electric sample exists
 * locally) — see `getElectricGuitarChain` below for why these specific
 * processor settings were chosen.
 */
export class TuningExplorerAudioInitError extends Error {
  constructor(cause: unknown) {
    super("Audio playback could not be started.");
    this.name = "TuningExplorerAudioInitError";
    this.cause = cause;
  }
}

async function ensureAudioReady(): Promise<void> {
  try {
    await Tone.start();
  } catch (cause) {
    throw new TuningExplorerAudioInitError(cause);
  }
}

interface SampleMap {
  baseUrl: string;
  urls: Record<string, string>;
}

const GUITAR_SAMPLES: SampleMap = {
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
};

const BASS_SAMPLES: SampleMap = {
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
};

/**
 * The single distorted electric-guitar signal chain (product spec §18 — no
 * clean/distorted selector, exactly one convincing distorted timbre) built
 * from the same clean steel-string samples as Acoustic Guitar:
 * `Distortion` for real waveshaping grit (0.45 — clearly distorted without
 * collapsing into pure fuzz noise, tuned by ear for low drop tunings like
 * Drop C/Drop A to still read as pitched notes, not mush), `EQ3` scooping
 * the lows slightly and lifting the mids (very low drop tunings otherwise
 * turn to undefined rumble once distorted — see product spec §18's own
 * "make low rock/metal tunings feel meaningful" requirement) and lifting
 * presence, and a `Compressor` for sustain/glue, matching how a real
 * distorted electric guitar signal chain is typically built. Lazily
 * created once, shared by every Electric Guitar note this session.
 */
function buildElectricGuitarChain(): Tone.ToneAudioNode {
  const distortion = new Tone.Distortion(0.45);
  const eq = new Tone.EQ3({ low: -3, mid: 3, high: 1 });
  const compressor = new Tone.Compressor({ threshold: -22, ratio: 4, attack: 0.003, release: 0.15 });
  distortion.connect(eq);
  eq.connect(compressor);
  compressor.toDestination();
  return distortion;
}

interface InstrumentVoice {
  sampler: Tone.Sampler;
  ready: Promise<void>;
}

const voices = new Map<TuningExplorerInstrument, InstrumentVoice>();

function createVoice(instrument: TuningExplorerInstrument): InstrumentVoice {
  const map = instrument === "bass" ? BASS_SAMPLES : GUITAR_SAMPLES;
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const sampler = new Tone.Sampler({
    urls: map.urls,
    baseUrl: map.baseUrl,
    release: 1.0,
    onload: () => resolveReady(),
  });

  if (instrument === "electricGuitar") {
    sampler.connect(buildElectricGuitarChain());
  } else {
    sampler.toDestination();
  }

  return { sampler, ready };
}

function getVoice(instrument: TuningExplorerInstrument): InstrumentVoice {
  const existing = voices.get(instrument);
  if (existing) return existing;
  const voice = createVoice(instrument);
  voices.set(instrument, voice);
  return voice;
}

/**
 * Manual single-note playback (product spec §16) — every fret click is an
 * INDEPENDENT trigger. `Tone.Sampler` is polyphonic by default, so
 * overlapping calls naturally sound together rather than one cutting off
 * another; this function never tracks or cancels prior notes.
 */
export async function playNote(instrument: TuningExplorerInstrument, midi: number): Promise<void> {
  await ensureAudioReady();
  const voice = getVoice(instrument);
  await voice.ready;
  voice.sampler.triggerAttackRelease(frequencyFromMidi(midi), NOTE_DURATION_SECONDS);
}

/**
 * "Play open strings" (product spec §17) — schedules every open string
 * LOW -> HIGH using `scheduleOpenStrings`'s pure timing, via
 * `Tone.now()`-relative offsets (the same lightweight pattern Armony's own
 * `hearPitches` strum-delay uses for a short staggered sequence — no
 * `Tone.Transport` needed for a handful of notes over ~2 seconds).
 * `onStepStart` fires (synced to the audio clock via `Tone.Draw`) exactly
 * when each string actually sounds, driving the fret-0 highlight.
 */
export async function playOpenStrings(
  instrument: TuningExplorerInstrument,
  openStringsMidi: readonly number[],
  onStepStart?: (stringIndex: number) => void,
): Promise<void> {
  await ensureAudioReady();
  const voice = getVoice(instrument);
  await voice.ready;

  const steps = scheduleOpenStrings(openStringsMidi);
  const now = Tone.now();
  for (const step of steps) {
    const time = now + step.startSeconds;
    voice.sampler.triggerAttackRelease(frequencyFromMidi(step.midi), NOTE_DURATION_SECONDS, time);
    if (onStepStart) {
      Tone.getDraw().schedule(() => onStepStart(step.stringIndex), time);
    }
  }
}

/** Silences every currently-sounding Tuning Explorer voice — safe to call even when nothing is playing. */
export function stopAllTuningExplorerAudio(): void {
  for (const voice of voices.values()) voice.sampler.releaseAll();
}
