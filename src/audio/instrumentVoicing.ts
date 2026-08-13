import type { Chord } from "@/domain/chords";
import type { InstrumentName, PlayablePitch } from "@/domain/instruments";
import { pianoVoicingsFor } from "@/domain/instruments/piano";
import { guitarVoicingsFor } from "@/domain/instruments/guitar";
import { bassPatternsFor } from "@/domain/instruments/bass";
import { neutralVoicing } from "./voicing";

/**
 * Picks a deterministic, musically valid REPRESENTATIVE voicing/pattern for
 * `chord` on `instrument`, reusing each instrument's own existing domain
 * catalogue (Phase R3.3 §10/§11 — never a new audio engine, never a
 * regenerated ad-hoc voicing). This is what map/path audition and
 * progression playback use — deliberately NOT the specific inversion/shape/
 * pattern the user may have paged to in the right panel: the map does not
 * try to reproduce a whole historical path's worth of individually-chosen
 * voicings (§11), just one sensible default per chord, the same way every
 * chord already gets a top-ranked default voicing in its own panel (index
 * 0 of `pianoVoicingsFor`/`guitarVoicingsFor`/`bassPatternsFor` is always
 * that catalogue's best-ranked/curated choice — see those modules' own
 * docs). Falls back to the generic neutral close-position voicing only in
 * the rare case a catalogue returns nothing playable (Guitar can; Piano and
 * Bass never do) — still voiced through that instrument's own sampler, so
 * the timbre stays correct even in that edge case.
 */
export function representativePitchesFor(chord: Chord, instrument: InstrumentName): PlayablePitch[] {
  if (instrument === "piano") {
    const voicing = pianoVoicingsFor(chord)[0];
    return voicing ? voicing.pitches : neutralVoicing(chord);
  }
  if (instrument === "guitar") {
    const voicing = guitarVoicingsFor(chord)[0];
    if (!voicing) return neutralVoicing(chord);
    return voicing.strings.filter((s) => s.pitch).map((s) => s.pitch!);
  }
  return representativeBassSteps(chord);
}

/** How many of the default Bass pattern's steps to use for map/path audition (Phase R3.3 §14) — a short, concise excerpt, not the full pattern. */
const BASS_PATH_STEP_COUNT = 2;

/**
 * A short, deterministic excerpt from Bass's own default pattern (Phase
 * R3.3 §14) — Bass is a melodic/sequential instrument, not a low guitar, so
 * even in cumulative map/path audition it plays a couple of notes in
 * sequence rather than one simultaneous block chord (never "convert Bass
 * into simultaneous Piano-style chords", §14). Capped at
 * `BASS_PATH_STEP_COUNT` notes so a multi-chord path audition stays concise
 * rather than playing each chord's full walking pattern (§14's "so the user
 * can still hear the route without making playback excessively long").
 * Falls back to the neutral voicing's pitches (still just the first two, to
 * stay melodic) in the near-impossible case no pattern is generated.
 */
export function representativeBassSteps(chord: Chord, maxSteps: number = BASS_PATH_STEP_COUNT): PlayablePitch[] {
  const pattern = bassPatternsFor(chord)[0];
  if (!pattern) return neutralVoicing(chord).slice(0, maxSteps);
  return pattern.steps.slice(0, maxSteps).map((step) => step.pitch);
}
