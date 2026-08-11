import { chordNotes, type Chord } from "@/domain/chords";
import { stackAscending, type PlayablePitch } from "@/domain/instruments/playablePitch";

/** Root sits around middle C — a compact, unremarkable register for a neutral preview synth, never a muddy sub-bass or a piercingly high register. */
export const DEFAULT_ROOT_OCTAVE = 4;

/**
 * A compact "neutral" close-position voicing (Phase 6 §5): the root sits at
 * `rootOctave`, and each subsequent formula tone (in the chord's normal
 * root-third-fifth-... order, from `chordNotes`) is placed in whichever
 * octave keeps it the smallest ascending step above the previous tone —
 * `stackAscending` from `src/domain/instruments/playablePitch`, the same
 * close-position algorithm instrument-specific voicings use. This is
 * deliberately NOT an instrument-accurate voicing (guitar/piano/bass
 * voicings are `src/domain/instruments/{piano,guitar,bass}`) — just a
 * musically sensible, always-compact stack for hearing harmonic content.
 */
export function neutralVoicing(chord: Chord, rootOctave: number = DEFAULT_ROOT_OCTAVE): PlayablePitch[] {
  return stackAscending(chordNotes(chord), rootOctave);
}
