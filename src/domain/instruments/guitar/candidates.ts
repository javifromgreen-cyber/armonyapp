import type { Chord } from "../../chords/chord";
import { mod12, noteToPitchClass } from "../../notes";
import { chordToneTable, toneForPitchClass } from "./chordTones";
import { openStringPitchClass } from "./tuning";
import { STRING_NUMBERS } from "./types";

/**
 * A fret search region (Phase 8 §7/§28). Rather than blindly sliding an
 * arbitrary window across the whole neck, each window is anchored to a
 * musically real shape family guitarists actually use:
 *   - **open**: frets 0-4, open strings allowed — the traditional
 *     "open position" chords.
 *   - **E-shape-root / A-shape-root**: a 4-fret window starting at the fret
 *     where the chord's root falls on string 6 or string 5 respectively —
 *     the two standard movable-barre-chord families (named for the open E
 *     and A shapes they're based on). No open strings allowed, since a
 *     movable shape by definition doesn't rely on them.
 * This keeps the search both tractable (a handful of windows, not dozens)
 * and musically grounded — every window corresponds to how a guitarist
 * would actually think about the position, not an arbitrary numeric scan.
 */
export interface SearchWindow {
  id: string;
  allowOpen: boolean;
  minFret: number;
  maxFret: number;
}

const OPEN_WINDOW: SearchWindow = { id: "open", allowOpen: true, minFret: 0, maxFret: 4 };
const WINDOW_SPAN = 3; // a 4-fret-wide window (minFret..minFret+3)

export function movableWindow(id: string, rootFret: number): SearchWindow {
  return { id, allowOpen: false, minFret: rootFret, maxFret: rootFret + WINDOW_SPAN };
}

export function standardSearchWindows(chord: Chord): SearchWindow[] {
  const rootPitchClass = noteToPitchClass(chord.root);
  const rootFretString6 = mod12(rootPitchClass - openStringPitchClass(6));
  const rootFretString5 = mod12(rootPitchClass - openStringPitchClass(5));
  return [
    OPEN_WINDOW,
    movableWindow("e-shape", rootFretString6),
    movableWindow("a-shape", rootFretString5),
  ];
}

export interface RawCandidate {
  windowId: string;
  /** Ordered string 6 → string 1, "mute" or a fret (0 = open). */
  frets: (number | "mute")[];
}

function optionsForString(
  stringNumber: (typeof STRING_NUMBERS)[number],
  tones: ReturnType<typeof chordToneTable>,
  window: SearchWindow,
): (number | "mute")[] {
  const options: (number | "mute")[] = ["mute"];
  const openPc = openStringPitchClass(stringNumber);

  if (window.allowOpen && toneForPitchClass(tones, openPc)) {
    options.push(0);
  }

  const start = Math.max(window.minFret, 1);
  for (let fret = start; fret <= window.maxFret; fret++) {
    const pitchClass = mod12(openPc + fret);
    if (toneForPitchClass(tones, pitchClass)) options.push(fret);
  }

  return options;
}

/** Every fret/mute combination within `window` that never sounds a non-chord-tone pitch — the raw search space before playability filtering. */
export function generateCandidatesInWindow(chord: Chord, window: SearchWindow): RawCandidate[] {
  const tones = chordToneTable(chord);
  const perString = STRING_NUMBERS.map((stringNumber) => optionsForString(stringNumber, tones, window));

  let combos: (number | "mute")[][] = [[]];
  for (const options of perString) {
    const next: (number | "mute")[][] = [];
    for (const combo of combos) {
      for (const option of options) {
        next.push([...combo, option]);
      }
    }
    combos = next;
  }

  return combos.map((frets) => ({ windowId: window.id, frets }));
}
