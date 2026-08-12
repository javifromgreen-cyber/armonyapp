import type { Chord } from "../../chords/chord";
import { chordToneTable, buildStringSound, mutedStringSound } from "./chordTones";
import { STRING_NUMBERS, type BarreInfo, type GuitarStringSound, type StringNumber } from "./types";
import type { RawCandidate } from "./candidates";

/** Phase 8 §7: prefer fretted notes within ~3-4 frets. */
const MAX_FRET_SPAN = 4;
/** Phase 8 §8: a normal hand has 4 fretting fingers; a barre counts as one. */
const MAX_INDEPENDENT_FINGERS = 4;
/** Fewer than 3 sounding strings doesn't read as a chord shape. */
const MIN_SOUNDING_STRINGS = 3;

export interface EvaluatedVoicing {
  strings: GuitarStringSound[];
  fretSpan: number;
  baseFret: number;
  barre?: BarreInfo;
  fingerCount: number;
  openStringCount: number;
  soundingStringCount: number;
  mutedInteriorCount: number;
}

type FrettedStringSound = GuitarStringSound & {
  state: { status: "fretted"; fret: number; finger?: 1 | 2 | 3 | 4 };
};

function isFretted(sound: GuitarStringSound): sound is FrettedStringSound {
  return sound.state.status === "fretted";
}

/**
 * A barre finger lies flat across a CONTINUOUS range of strings — it
 * physically touches every string in that range, not just the ones that
 * end up sounding at the barre fret specifically (a string within the
 * range fretted HIGHER by another finger is still "under" the barre; one
 * that's open or muted is not physically consistent with a barre being
 * there at all). So: find the lowest and highest string number sharing
 * `baseFret`, then require every string in that full range to be fretted
 * (never open, never muted) before crediting a barre — this is what makes
 * e.g. F major's 1-3-3-2-1-1 a valid full 6-string barre even though only
 * strings 6/2/1 actually sound at fret 1.
 */
function detectBarre(
  baseFret: number,
  stringsAtBaseFret: StringNumber[],
  allStrings: GuitarStringSound[],
): BarreInfo | undefined {
  if (stringsAtBaseFret.length < 2) return undefined;

  const lo = Math.min(...stringsAtBaseFret);
  const hi = Math.max(...stringsAtBaseFret);
  const range: StringNumber[] = [];
  for (let s = lo; s <= hi; s++) range.push(s as StringNumber);

  const allFretted = range.every((stringNumber) => {
    const sound = allStrings.find((s) => s.string === stringNumber);
    return sound?.state.status === "fretted";
  });
  if (!allFretted) return undefined;

  return { finger: 1, fret: baseFret, strings: [...range].sort((a, b) => b - a) };
}

function countMutedInterior(strings: GuitarStringSound[]): number {
  let count = 0;
  for (let i = 1; i < strings.length - 1; i++) {
    if (strings[i].state.status !== "muted") continue;
    const soundsBefore = strings.slice(0, i).some((s) => s.state.status !== "muted");
    const soundsAfter = strings.slice(i + 1).some((s) => s.state.status !== "muted");
    if (soundsBefore && soundsAfter) count++;
  }
  return count;
}

/**
 * Turns a raw fret/mute pattern into a physically evaluated voicing, or
 * `undefined` if it fails a hard playability constraint (Phase 8 §6):
 * too few sounding strings, fret span too wide, or more independent
 * fretting fingers than a hand has (after crediting a real, contiguous
 * barre as a single finger — Phase 8 §9).
 */
export function evaluateCandidate(chord: Chord, candidate: RawCandidate): EvaluatedVoicing | undefined {
  const tones = chordToneTable(chord);
  const strings: GuitarStringSound[] = STRING_NUMBERS.map((stringNumber, index) => {
    const fret = candidate.frets[index];
    if (fret === "mute") return mutedStringSound(stringNumber);
    const sound = buildStringSound(stringNumber, fret, tones);
    if (!sound) {
      throw new Error(
        `Invalid candidate: fret ${fret} on string ${stringNumber} is not a chord tone of ${chord.root.letter}${chord.qualityId}.`,
      );
    }
    return sound;
  });

  const soundingCount = strings.filter((s) => s.state.status !== "muted").length;
  if (soundingCount < MIN_SOUNDING_STRINGS) return undefined;

  const frettedEntries = strings.filter(isFretted);
  const frets = frettedEntries.map((s) => s.state.fret);
  const fretSpan = frets.length > 0 ? Math.max(...frets) - Math.min(...frets) : 0;
  if (fretSpan > MAX_FRET_SPAN) return undefined;

  const baseFret = frets.length > 0 ? Math.min(...frets) : 0;
  const stringsAtBaseFret = frettedEntries.filter((s) => s.state.fret === baseFret).map((s) => s.string);
  const barre = detectBarre(baseFret, stringsAtBaseFret, strings);

  // Strings the barre finger alone accounts for — exactly those fretted AT
  // the barre fret. A string physically under the barre's span but fretted
  // HIGHER by another finger (e.g. F major's ring/middle/pinky notes) still
  // needs its own independent finger.
  const barredAtBarreFret = new Set(
    barre ? frettedEntries.filter((s) => s.state.fret === barre.fret).map((s) => s.string) : [],
  );

  const remainingFretted = frettedEntries.filter((s) => !barredAtBarreFret.has(s.string));
  const fingerCount = (barre ? 1 : 0) + remainingFretted.length;
  if (fingerCount > MAX_INDEPENDENT_FINGERS) return undefined;

  assignFingers(strings, barre, remainingFretted, barredAtBarreFret);

  return {
    strings,
    fretSpan,
    baseFret,
    barre,
    fingerCount,
    openStringCount: strings.filter((s) => s.state.status === "open").length,
    soundingStringCount: soundingCount,
    mutedInteriorCount: countMutedInterior(strings),
  };
}

/**
 * Suggested fingering (Phase 8 §11): a real barre finger covers every
 * string sharing the lowest fret; every other fretted note gets its own
 * finger, assigned in ascending fret order — the standard convention for
 * open/basic shapes (e.g. C major's 1-2-3 fret pattern maps directly to
 * fingers 1-2-3). This is a suggestion, not the only valid fingering.
 */
function assignFingers(
  strings: GuitarStringSound[],
  barre: BarreInfo | undefined,
  remainingFretted: FrettedStringSound[],
  barredAtBarreFret: Set<StringNumber>,
): void {
  if (barre) {
    for (const sound of strings) {
      if (isFretted(sound) && barredAtBarreFret.has(sound.string)) {
        sound.state.finger = barre.finger;
      }
    }
  }

  const availableFingers: (1 | 2 | 3 | 4)[] = barre ? [2, 3, 4] : [1, 2, 3, 4];
  const sorted = [...remainingFretted].sort((a, b) => a.state.fret - b.state.fret);
  sorted.forEach((sound, index) => {
    if (isFretted(sound)) {
      sound.state.finger = availableFingers[index];
    }
  });
}
