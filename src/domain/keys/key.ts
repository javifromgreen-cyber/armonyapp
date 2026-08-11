import type { Note } from "../notes/types";
import { mod12 } from "../notes/pitchClass";
import { noteToPitchClass } from "../notes/note";
import { noteAtScaleDegree } from "../intervals/scaleDegree";
import { buildChord, type Chord } from "../chords/chord";
import type { ChordQualityId } from "../chords/chordQuality";

export type KeyMode = "major" | "natural-minor";

export interface Key {
  tonic: Note;
  mode: KeyMode;
}

/** Alteration applied to each scale degree (1-7) for a given mode; 0 = unaltered. */
const MODE_ALTERATIONS: Record<KeyMode, readonly number[]> = {
  major: [0, 0, 0, 0, 0, 0, 0],
  "natural-minor": [0, 0, -1, 0, 0, -1, -1],
};

/** The 7 scale notes of a key, in degree order (index 0 = tonic). */
export function keyScaleNotes(key: Key): Note[] {
  const alterations = MODE_ALTERATIONS[key.mode];
  return alterations.map((alteration, index) =>
    noteAtScaleDegree(key.tonic, { degree: index + 1, alteration }),
  );
}

export type TriadQuality = "major" | "minor" | "diminished" | "augmented";

const TRIAD_QUALITY_BY_INTERVALS: Record<string, TriadQuality> = {
  "4,7": "major",
  "3,7": "minor",
  "3,6": "diminished",
  "4,8": "augmented",
};

function classifyTriad(thirdInterval: number, fifthInterval: number): TriadQuality {
  const quality = TRIAD_QUALITY_BY_INTERVALS[`${thirdInterval},${fifthInterval}`];
  if (!quality) {
    throw new Error(
      `Unrecognized triad interval pattern (${thirdInterval}, ${fifthInterval}).`,
    );
  }
  return quality;
}

const TRIAD_QUALITY_TO_CHORD_QUALITY: Record<TriadQuality, ChordQualityId> = {
  major: "major",
  minor: "minor",
  diminished: "diminished",
  augmented: "augmented",
};

export interface DiatonicChord {
  /** 1-7, the scale degree this chord is built on. */
  degree: number;
  quality: TriadQuality;
  chord: Chord;
}

/**
 * The 7 diatonic triads of a key, built by stacking thirds within the key's own
 * scale (not a hardcoded per-degree quality table) — so the correct pattern
 * (major/minor/diminished) falls out of the scale itself for any mode.
 */
export function diatonicChords(key: Key): DiatonicChord[] {
  const scale = keyScaleNotes(key);
  const pitchClasses = scale.map(noteToPitchClass);

  return scale.map((root, index) => {
    const thirdIndex = (index + 2) % 7;
    const fifthIndex = (index + 4) % 7;
    const thirdInterval = mod12(pitchClasses[thirdIndex] - pitchClasses[index]);
    const fifthInterval = mod12(pitchClasses[fifthIndex] - pitchClasses[index]);
    const quality = classifyTriad(thirdInterval, fifthInterval);
    return {
      degree: index + 1,
      quality,
      chord: buildChord(root, TRIAD_QUALITY_TO_CHORD_QUALITY[quality]),
    };
  });
}

/**
 * The relative major/minor of a key: the natural minor built on the major
 * key's 6th degree, or the major built on the natural minor key's 3rd degree.
 */
export function relativeKey(key: Key): Key {
  const scale = keyScaleNotes(key);
  return key.mode === "major"
    ? { tonic: scale[5], mode: "natural-minor" }
    : { tonic: scale[2], mode: "major" };
}
