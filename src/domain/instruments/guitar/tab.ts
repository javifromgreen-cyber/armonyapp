import type { GuitarVoicing } from "./types";

export interface TabLine {
  /** e.g. "e", "B", "G", "D", "A", "E" — the conventional lowercase-e-on-top tab label for string 1. */
  label: string;
  /** "x" (muted), "0" (open), or the fret number as a string. */
  symbol: string;
}

/**
 * Renders the exact current voicing as tab lines, high string (1, "e")
 * first — the conventional tab reading order — through low string (6, "E")
 * last (Phase 8 §16). Always derived directly from `GuitarVoicing.strings`,
 * never a separately maintained/hard-coded tab string, so it can never
 * drift out of sync with the diagram.
 */
export function tabLinesFor(voicing: GuitarVoicing): TabLine[] {
  return [...voicing.strings]
    .sort((a, b) => a.string - b.string) // ascending string number: 1 (high e) first
    .map((sound) => ({
      label: sound.string === 1 ? "e" : stringLetter(sound.string),
      symbol:
        sound.state.status === "muted"
          ? "x"
          : sound.state.status === "open"
            ? "0"
            : String(sound.state.fret),
    }));
}

function stringLetter(stringNumber: number): string {
  switch (stringNumber) {
    case 5:
      return "A";
    case 4:
      return "D";
    case 3:
      return "G";
    case 2:
      return "B";
    default:
      return "E";
  }
}
