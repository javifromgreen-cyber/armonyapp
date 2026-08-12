import type { Chord } from "../../chords/chord";
import { bassChordToneTable, buildPatternStep, toneForPitchClass, type ChordTone } from "./chordTones";
import { fretForPitchClass } from "./tuning";
import { BASS_STRING_NUMBERS, type BassPatternStep, type BassStringNumber } from "./types";

/**
 * Comfortable low-position bass hand span (Phase 9 §14) — bass frets are
 * noticeably wider apart than guitar's, so the "local position" a search
 * stays within by default is deliberately smaller in spirit than it looks
 * numerically; combined with the 1-2-4 fingering convention
 * (`playability.ts`), this keeps generated patterns within a real
 * one-hand-position stretch rather than assuming guitar-like ergonomics.
 */
const LOCAL_WINDOW_SPAN = 5;

/**
 * How far beyond the local window a search may reach for a tone that
 * doesn't fit locally — representing one legitimate small position shift
 * (Phase 9 §16), never an unbounded search. In practice a 4-string bass
 * covers every pitch class multiple times within a handful of frets, so
 * this fallback rarely fires for the V1 chord catalogue; it exists so the
 * generator fails honestly (returns nothing) rather than reaching
 * arbitrarily far up the neck.
 */
const SHIFT_SEARCH_SPAN = 12;

export interface RootAnchor {
  string: BassStringNumber;
  fret: number;
}

/**
 * The two standard bass navigation anchors (Phase 9 §13): root on the E
 * string (4) and root on the A string (3) — the two strings bassists
 * conventionally use as home positions, never a fixed single string for
 * every chord.
 */
export function rootAnchors(chord: Chord): RootAnchor[] {
  const tones = bassChordToneTable(chord);
  const rootPitchClass = tones[0].pitchClass;
  return [
    { string: 4, fret: fretForPitchClass(4, rootPitchClass) },
    { string: 3, fret: fretForPitchClass(3, rootPitchClass) },
  ];
}

/**
 * The nearest (string, fret) reaching `pitchClass` at a pitch strictly
 * higher than `afterMidi` — searches the local window first, only
 * reaching further (§16's "small hand shift") if nothing fits locally.
 * Prefers the smallest ascending step; on a genuine pitch tie (the exact
 * same note is reachable on more than one string within a 4-string
 * instrument, which happens often) prefers whichever fret is PHYSICALLY
 * closest to the previous step's fret — a same-string slide of several
 * frets is a bigger hand movement than a one-fret shift to the adjacent
 * string, even though both land on the identical pitch, so fret distance
 * (not string-number distance) is what actually captures "closest
 * physically" here. String-number distance from `nearString` is only the
 * final tie-break, for the rare case even the fret distance ties. Returns
 * `undefined` if genuinely nothing reaches this tone within either search
 * radius — never fabricates a position (Phase 9 §12).
 */
function findNextAscending(
  pitchClass: number,
  afterMidi: number,
  afterFret: number,
  baseFret: number,
  nearString: BassStringNumber,
  tones: ChordTone[],
): BassPatternStep | undefined {
  const tone = toneForPitchClass(tones, pitchClass);
  if (!tone) return undefined;

  for (const maxFret of [baseFret + LOCAL_WINDOW_SPAN, baseFret + SHIFT_SEARCH_SPAN]) {
    const candidates: BassPatternStep[] = [];
    for (const stringNumber of BASS_STRING_NUMBERS) {
      for (let fret = 0; fret <= maxFret; fret++) {
        const step = buildPatternStep(stringNumber, fret, tones);
        if (!step || step.intervalToken !== tone.token) continue;
        if (step.pitch.midi <= afterMidi) continue;
        candidates.push(step);
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => {
      if (a.pitch.midi !== b.pitch.midi) return a.pitch.midi - b.pitch.midi;
      const aFretDistance = Math.abs(a.fret - afterFret);
      const bFretDistance = Math.abs(b.fret - afterFret);
      if (aFretDistance !== bFretDistance) return aFretDistance - bFretDistance;
      return Math.abs(a.string - nearString) - Math.abs(b.string - nearString);
    });
    return candidates[0];
  }
  return undefined;
}

/**
 * Root → (each subsequent formula tone, ascending) → … , closing on the
 * octave root when the chord is a plain triad (Phase 9 §9's worked example
 * "C major: 1 → 3 → 5 → 8" — a triad has no 7th/extension to land on, so
 * the pattern would otherwise end mid-harmony on the 5th). Chords with a
 * 7th/6th/9th already end on a tone that clearly states the chord's
 * quality, so no octave is appended for those (Phase 9 §9's Cmaj7 example:
 * "1 → 3 → 5 → 7", no trailing octave).
 */
export function buildAscendingSteps(chord: Chord, anchor: RootAnchor): BassPatternStep[] | undefined {
  const tones = bassChordToneTable(chord);
  const rootTone = tones[0];

  const rootStep = buildPatternStep(anchor.string, anchor.fret, tones);
  if (!rootStep || rootStep.intervalToken !== rootTone.token) return undefined;
  const steps: BassPatternStep[] = [rootStep];

  for (let i = 1; i < tones.length; i++) {
    const previous = steps[steps.length - 1];
    const next = findNextAscending(
      tones[i].pitchClass,
      previous.pitch.midi,
      previous.fret,
      anchor.fret,
      previous.string,
      tones,
    );
    if (!next) return undefined;
    steps.push(next);
  }

  if (tones.length === 3) {
    const previous = steps[steps.length - 1];
    const octave = findNextAscending(
      rootTone.pitchClass,
      previous.pitch.midi,
      previous.fret,
      anchor.fret,
      previous.string,
      tones,
    );
    if (!octave) return undefined;
    steps.push(octave);
  }

  return steps;
}

/**
 * Root → 5th-family tone → octave root (Phase 9 §11's "root–5th–octave
 * based pattern") — the harmonic skeleton, deliberately skipping the
 * 3rd/7th/extensions. Uses whichever 5th-family tone the chord actually
 * has (5, b5, or #5 — diminished/augmented chords are never silently
 * treated as if they had a plain 5th).
 */
export function buildRootFifthOctaveSteps(chord: Chord, anchor: RootAnchor): BassPatternStep[] | undefined {
  const tones = bassChordToneTable(chord);
  const rootTone = tones[0];
  const fifthTone = tones.find((tone) => tone.token === "5" || tone.token === "b5" || tone.token === "#5");
  if (!fifthTone) return undefined;

  const rootStep = buildPatternStep(anchor.string, anchor.fret, tones);
  if (!rootStep || rootStep.intervalToken !== rootTone.token) return undefined;

  const fifthStep = findNextAscending(
    fifthTone.pitchClass,
    rootStep.pitch.midi,
    rootStep.fret,
    anchor.fret,
    rootStep.string,
    tones,
  );
  if (!fifthStep) return undefined;

  const octaveStep = findNextAscending(
    rootTone.pitchClass,
    fifthStep.pitch.midi,
    fifthStep.fret,
    anchor.fret,
    fifthStep.string,
    tones,
  );
  if (!octaveStep) return undefined;

  return [rootStep, fifthStep, octaveStep];
}

/** The exact same notes, high to low (Phase 9 §11's "descending arpeggio") — never a separately regenerated pattern, so it can never drift from the ascending version it mirrors. */
export function reverseSteps(steps: BassPatternStep[]): BassPatternStep[] {
  return [...steps].reverse();
}
