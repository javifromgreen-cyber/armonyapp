import type { Chord } from "../chords/chord";
import { chordNotes } from "../chords/chord";
import { noteToPitchClass } from "../notes/note";
import type { PitchClass } from "../notes/types";

/**
 * An enharmonic-invariant identity for a chord (root pitch class + quality) —
 * used to de-duplicate and compare chords across relationship families that may
 * independently re-derive "the same" chord with different (but both
 * context-correct) spelling.
 */
export function chordIdentityKey(chord: Chord): string {
  return `${noteToPitchClass(chord.root)}:${chord.qualityId}`;
}

export function chordsEqual(a: Chord, b: Chord): boolean {
  return chordIdentityKey(a) === chordIdentityKey(b);
}

function pitchClassSet(chord: Chord): Set<PitchClass> {
  return new Set(chordNotes(chord).map(noteToPitchClass));
}

/** How many pitch classes two chords have in common. */
export function sharedToneCount(a: Chord, b: Chord): number {
  const aPcs = pitchClassSet(a);
  const bPcs = pitchClassSet(b);
  let count = 0;
  for (const pc of aPcs) {
    if (bPcs.has(pc)) count++;
  }
  return count;
}
