/**
 * The v1.0 chord catalogue (product-spec.md §10). Each quality carries its
 * interval formula as scale-degree tokens (parsed by ../intervals) and the
 * symbol suffixes accepted when parsing a chord symbol — the first suffix is
 * canonical and used when formatting.
 */
export const CHORD_QUALITY_IDS = [
  "major",
  "minor",
  "diminished",
  "augmented",
  "sus2",
  "sus4",
  "maj7",
  "dominant7",
  "minor7",
  "minor7flat5",
  "diminished7",
  "add9",
  "six",
  "minorSix",
  "nine",
  "minorNine",
  "majorNine",
] as const;

export type ChordQualityId = (typeof CHORD_QUALITY_IDS)[number];

export interface ChordQuality {
  id: ChordQualityId;
  /** Symbol suffixes accepted when parsing; suffixes[0] is canonical for formatting. */
  suffixes: readonly string[];
  /** Scale-degree formula tokens, e.g. ["1", "b3", "5", "b7"]. */
  formula: readonly string[];
}

export const CHORD_QUALITIES: Record<ChordQualityId, ChordQuality> = {
  major: { id: "major", suffixes: [""], formula: ["1", "3", "5"] },
  minor: { id: "minor", suffixes: ["m", "min"], formula: ["1", "b3", "5"] },
  diminished: {
    id: "diminished",
    suffixes: ["dim", "o"],
    formula: ["1", "b3", "b5"],
  },
  augmented: {
    id: "augmented",
    suffixes: ["aug", "+"],
    formula: ["1", "3", "#5"],
  },
  sus2: { id: "sus2", suffixes: ["sus2"], formula: ["1", "2", "5"] },
  sus4: { id: "sus4", suffixes: ["sus4"], formula: ["1", "4", "5"] },
  maj7: { id: "maj7", suffixes: ["maj7", "M7"], formula: ["1", "3", "5", "7"] },
  dominant7: { id: "dominant7", suffixes: ["7"], formula: ["1", "3", "5", "b7"] },
  minor7: {
    id: "minor7",
    suffixes: ["m7", "min7"],
    formula: ["1", "b3", "5", "b7"],
  },
  minor7flat5: {
    id: "minor7flat5",
    suffixes: ["m7b5", "min7b5", "ø7"],
    formula: ["1", "b3", "b5", "b7"],
  },
  diminished7: {
    id: "diminished7",
    suffixes: ["dim7", "o7"],
    formula: ["1", "b3", "b5", "bb7"],
  },
  add9: { id: "add9", suffixes: ["add9"], formula: ["1", "3", "5", "9"] },
  six: { id: "six", suffixes: ["6"], formula: ["1", "3", "5", "6"] },
  minorSix: {
    id: "minorSix",
    suffixes: ["m6", "min6"],
    formula: ["1", "b3", "5", "6"],
  },
  nine: { id: "nine", suffixes: ["9"], formula: ["1", "3", "5", "b7", "9"] },
  minorNine: {
    id: "minorNine",
    suffixes: ["m9", "min9"],
    formula: ["1", "b3", "5", "b7", "9"],
  },
  majorNine: {
    id: "majorNine",
    suffixes: ["maj9", "M9"],
    formula: ["1", "3", "5", "7", "9"],
  },
};

/** suffix (exact string, e.g. "m7b5") -> quality id, built once from the catalogue. */
const SUFFIX_LOOKUP: ReadonlyMap<string, ChordQualityId> = new Map(
  CHORD_QUALITY_IDS.flatMap((id) =>
    CHORD_QUALITIES[id].suffixes.map((suffix) => [suffix, id] as const),
  ),
);

export function chordQualityFromSuffix(suffix: string): ChordQualityId | undefined {
  return SUFFIX_LOOKUP.get(suffix);
}

export function canonicalSuffix(id: ChordQualityId): string {
  return CHORD_QUALITIES[id].suffixes[0];
}
