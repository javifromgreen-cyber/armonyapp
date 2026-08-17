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
 * from the same clean steel-string samples as Acoustic Guitar.
 *
 * Revision note: the first version of this chain (plain `Distortion` ->
 * `EQ3` boosting highs -> `Compressor`) read as "clean acoustic-steel pluck
 * with fuzz laid on top" rather than a real amp tone. `acoustic_guitar_steel`
 * is a genuinely bright, broadband, plucky source (lots of string/pick noise
 * well above 5kHz) — waveshaping distortion amplifies that high-frequency
 * content roughly as much as everything else, so the result kept the
 * source's steel-string jangle instead of gaining amp character. A real
 * guitar amp signal chain does three things this first version didn't:
 * drives the input hard before clipping (not just clips lightly), rolls off
 * sharply above ~4-5kHz the way a mic'd speaker cabinet does, and pushes the
 * midrange forward rather than the treble. This revision adds exactly those,
 * in order:
 *
 * 1. `preFilter` — a gentle highpass at 32Hz, well below the lowest actual
 *    note this app ever plays (F1 ≈ 43.65Hz, the low string of 7-string
 *    Drop F). This is not a tone control — it only removes inaudible
 *    sub-rumble/DC bias that the waveshaper could otherwise turn into
 *    audible mud, it never touches a real note's fundamental.
 * 2. `drive` — a fixed +8dB pre-gain boost so the signal is pushed hard
 *    into the waveshaper (genuine overdrive/saturation), not merely
 *    clipped at low level (which is what reads as "fuzz pedal on a clean
 *    sample" rather than "driven amp").
 * 3. `distortion` — raised to 0.7 (from 0.45) with 4x oversampling.
 *    Oversampling is the single biggest fix for the "metallic/digital"
 *    complaint: un-oversampled WaveShaper distortion on an already-bright
 *    source generates harsh aliased high-frequency content; 4x oversampling
 *    removes most of that artifact.
 * 4. `cabinet` — a -24dB/oct lowpass at 4.2kHz emulating a mic'd guitar
 *    cabinet's natural rolloff. This is the second big fix: a real amp
 *    simply does not reproduce much energy above ~4-5kHz, so leaving that
 *    content in is what made the distorted result still sound like a bright
 *    steel-string acoustic. The highest fundamental this app ever plays
 *    (7-string B3 + 24 frets ≈ B5, ~987Hz) sits far below this cutoff, so
 *    only harmonic/distortion content is tamed, never a note's own pitch.
 * 5. `eq` — re-tuned from the first version: mids pushed up hard (+5, not
 *    +3) for the "electric guitar in the room" midrange character and
 *    single-note intelligibility on low drop tunings, lows trimmed
 *    slightly (-2, not -3) to control boom without thinning the
 *    fundamental, highs cut (-6, not boosted +1) since brightness was the
 *    problem, not the fix — `cabinet` above already did the heavy lifting.
 * 6. `compressor` — attack nudged out to 8ms (from 3ms) so the pick
 *    transient pokes through briefly before gain reduction engages (a
 *    clearer attack), threshold/ratio raised for stronger sustain/glue
 *    across the existing ~1s note duration.
 * 7. `outputTrim` — the extra drive and heavier distortion raise perceived
 *    loudness; trimmed back down so Electric Guitar isn't jarringly louder
 *    than Acoustic Guitar/Bass, which are intentionally left untouched.
 *
 * Lazily created once, shared by every Electric Guitar note this session.
 */
function buildElectricGuitarChain(): Tone.ToneAudioNode {
  const preFilter = new Tone.Filter({ frequency: 32, type: "highpass", rolloff: -12 });
  const drive = new Tone.Gain(8, "decibels");
  const distortion = new Tone.Distortion({ distortion: 0.7, oversample: "4x" });
  const cabinet = new Tone.Filter({ frequency: 4200, type: "lowpass", rolloff: -24 });
  const eq = new Tone.EQ3({ low: -2, mid: 5, high: -6 });
  const compressor = new Tone.Compressor({ threshold: -24, ratio: 6, attack: 0.008, release: 0.2 });
  const outputTrim = new Tone.Gain(0.75);

  preFilter.connect(drive);
  drive.connect(distortion);
  distortion.connect(cabinet);
  cabinet.connect(eq);
  eq.connect(compressor);
  compressor.connect(outputTrim);
  outputTrim.toDestination();
  return preFilter;
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
