import type { Note } from "../notes/types";
import { noteToPitchClass } from "../notes/note";

/**
 * A chord tone realized at a REAL octave — the shared currency every
 * instrument representation (piano now, guitar/bass later) and the audio
 * engine (`src/audio`) build on. Carries the spelled `Note` (not just a
 * pitch class) so displayed labels stay musically correct (e.g. "Db4", not
 * "C#4", when the harmonic context calls for a flat spelling — Phase 7
 * §16) — MIDI/frequency alone can't distinguish enharmonic spelling.
 *
 * Lives in `src/domain/instruments` (not `src/audio`) because it's pure
 * music theory — real-octave pitch math — with no Tone.js/Web Audio
 * dependency; `src/audio/voicing.ts`'s neutral playback voicing and every
 * instrument-specific voicing (piano now, guitar/bass later) both build
 * `PlayablePitch[]` here and hand it to the same low-level
 * `src/audio/player.ts` playback primitives.
 */
export interface PlayablePitch {
  note: Note;
  /** Scientific pitch notation octave — 4 is the octave containing middle C. */
  octave: number;
  midi: number;
  frequencyHz: number;
}

export function midiFromPitchClassAndOctave(pitchClass: number, octave: number): number {
  return (octave + 1) * 12 + pitchClass;
}

export function frequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playablePitch(note: Note, octave: number): PlayablePitch {
  const midi = midiFromPitchClassAndOctave(noteToPitchClass(note), octave);
  return { note, octave, midi, frequencyHz: frequencyFromMidi(midi) };
}

/** The same note one octave higher — used for "open"/octave-displacement voicings. */
export function playablePitchOneOctaveUp(pitch: PlayablePitch): PlayablePitch {
  return playablePitch(pitch.note, pitch.octave + 1);
}

/**
 * Places a sequence of notes (in formula order) at real octaves, close
 * position: the first note sits at `startOctave`; every subsequent note is
 * placed at whichever octave keeps it the smallest ascending step above
 * the previous one. This is THE shared close-position voicing algorithm —
 * neutral playback (`src/audio/voicing.ts`) and piano root/inversion
 * voicings (`./piano/voicing.ts`) both call this rather than each
 * re-implementing octave placement.
 */
export function stackAscending(notes: Note[], startOctave: number): PlayablePitch[] {
  const pitches: PlayablePitch[] = [];
  let previousMidi: number | undefined;

  for (const note of notes) {
    let octave = startOctave;
    let midi = midiFromPitchClassAndOctave(noteToPitchClass(note), octave);
    if (previousMidi !== undefined) {
      while (midi <= previousMidi) {
        octave += 1;
        midi = midiFromPitchClassAndOctave(noteToPitchClass(note), octave);
      }
    }
    pitches.push({ note, octave, midi, frequencyHz: frequencyFromMidi(midi) });
    previousMidi = midi;
  }

  return pitches;
}
