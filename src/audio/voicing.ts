import { chordNotes, type Chord } from "@/domain/chords";
import { noteToPitchClass } from "@/domain/notes";
import { midiFromPitchClassAndOctave, frequencyFromMidi } from "./pitch";

export interface PlayablePitch {
  pitchClass: number;
  midi: number;
  frequencyHz: number;
}

/** Root sits around middle C — a compact, unremarkable register for a neutral preview synth, never a muddy sub-bass or a piercingly high register. */
export const DEFAULT_ROOT_OCTAVE = 4;

/**
 * A compact "neutral" close-position voicing (Phase 6 §5): the root sits at
 * `rootOctave`, and each subsequent formula tone (in the chord's normal
 * root-third-fifth-... order, from `chordNotes`) is placed in whichever
 * octave keeps it the smallest ascending step above the previous tone. This
 * is deliberately NOT an instrument-accurate voicing (guitar/piano/bass
 * voicings are Phases 7-9) — just a musically sensible, always-compact
 * stack for hearing harmonic content.
 *
 * This is also the seam future instrument voicings hook into: they compute
 * their own `PlayablePitch[]` (or raw MIDI/frequency array) and pass it
 * straight to `./player.ts`'s low-level playback functions instead of this
 * generator, without any change to the player itself.
 */
export function neutralVoicing(chord: Chord, rootOctave: number = DEFAULT_ROOT_OCTAVE): PlayablePitch[] {
  const notes = chordNotes(chord);
  const pitches: PlayablePitch[] = [];
  let previousMidi: number | undefined;

  for (const note of notes) {
    const pitchClass = noteToPitchClass(note);
    let midi = midiFromPitchClassAndOctave(pitchClass, rootOctave);
    if (previousMidi !== undefined) {
      while (midi <= previousMidi) midi += 12;
    }
    pitches.push({ pitchClass, midi, frequencyHz: frequencyFromMidi(midi) });
    previousMidi = midi;
  }

  return pitches;
}
