/**
 * Pitch-class + octave -> playable frequency math. Framework-free (no
 * Tone.js/Web Audio import) so it's trivially unit-testable; the only
 * consumer that touches an actual audio API is `./player.ts`.
 *
 * MIDI note numbers follow the standard convention where C4 (middle C) is
 * 60 and A4 is 69/440Hz — equal temperament throughout, matching every
 * other pitch-class computation already used across `src/domain`.
 */

/** `octave` is scientific pitch notation (C4 = middle C), `pitchClass` is 0-11 (C=0). */
export function midiFromPitchClassAndOctave(pitchClass: number, octave: number): number {
  return (octave + 1) * 12 + pitchClass;
}

export function frequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
