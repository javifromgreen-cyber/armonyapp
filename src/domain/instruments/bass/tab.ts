import type { BassPattern, BassStringNumber } from "./types";

export interface BassTabLine {
  /** "G", "D", "A", "E". */
  label: string;
  /** One symbol per pattern STEP (a column of time, not a fret position) — the fret number on this string at that step, or "-" if this string doesn't sound then. */
  cells: string[];
}

const STRING_LABELS: Record<BassStringNumber, string> = { 1: "G", 2: "D", 3: "A", 4: "E" };
const STRING_ORDER: readonly BassStringNumber[] = [1, 2, 3, 4]; // high string (G) first, matching guitar/bass tab convention

/**
 * Sequential bass TAB (Phase 9 §21/§22) — one column per pattern STEP, not
 * per fret position, since a bass pattern is a sequence through time
 * rather than a simultaneous chord. Always derived directly from
 * `BassPattern.steps` (the same model driving the fretboard markers and
 * playback), so it can never drift out of sync with either. Each column
 * has exactly one sounding fret (on whichever string that step used) and
 * "-" on the other three strings, which visually communicates order the
 * same way real bass TAB does without full rhythmic notation.
 */
export function tabLinesFor(pattern: BassPattern): BassTabLine[] {
  return STRING_ORDER.map((stringNumber) => ({
    label: STRING_LABELS[stringNumber],
    cells: pattern.steps.map((step) => (step.string === stringNumber ? String(step.fret) : "-")),
  }));
}
