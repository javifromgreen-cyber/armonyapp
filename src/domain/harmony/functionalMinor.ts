import type { Note } from "../notes/types";
import { mod12 } from "../notes/pitchClass";
import { noteToPitchClass, spellPitchClass } from "../notes/note";
import type { Key } from "../keys/key";
import { keyScaleNotes } from "../keys/key";
import { buildChord, type Chord } from "../chords/chord";
import type { ChordQualityId } from "../chords/chordQuality";

/**
 * The leading tone of a key: scale degree 7 for major (already a half-step
 * below the tonic), or the *raised* natural-minor scale degree 7 (the
 * subtonic, spelled with the same letter, sharped) for natural-minor. This is
 * the harmony-layer's only "chromatic alteration" of the base scale, and it
 * does not touch src/domain/keys — it just re-spells one note a semitone
 * higher for this specific purpose.
 */
export function leadingTone(key: Key): Note {
  const scale = keyScaleNotes(key);
  const seventh = scale[6];
  if (key.mode === "major") return seventh;
  return spellPitchClass(mod12(noteToPitchClass(seventh) + 1), seventh.letter);
}

/**
 * The functional dominant chord of a key: the chord built on scale degree 5
 * with a dominant-family quality. This needs no mode branching and no scale
 * alteration — because chord construction (../chords) builds each formula
 * degree relative to the given root using its OWN interval pattern, rooting a
 * "dominant7" quality on a natural-minor key's (unaltered) 5th scale degree
 * already produces the raised third automatically (e.g. E7 = E G# B D on A
 * minor's degree-5 root E), which is exactly the harmonic-minor-derived
 * leading-tone dominant, without ever computing a harmonic-minor scale.
 */
export function functionalDominant(
  key: Key,
  quality: ChordQualityId = "dominant7",
): Chord {
  return buildChord(keyScaleNotes(key)[4], quality);
}

/**
 * The functional leading-tone diminished chord: built on the (possibly
 * raised) leading tone, e.g. G#dim7/G#m7b5 in A minor.
 */
export function functionalLeadingToneDiminished(
  key: Key,
  quality: ChordQualityId = "diminished7",
): Chord {
  return buildChord(leadingTone(key), quality);
}
