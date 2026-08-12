import type { Chord } from "../../chords/chord";
import {
  rootAnchors,
  buildAscendingSteps,
  buildRootFifthOctaveSteps,
  reverseSteps,
  type RootAnchor,
} from "./patternGeneration";
import { evaluatePattern, type EvaluatedPattern } from "./playability";
import { scorePattern } from "./ranking";
import { diversityFilter } from "./diversity";
import type { BassPattern, BassPatternType, VoicingCatalogue } from "./types";

/** Free ≈ 2 genuinely useful patterns (Phase 9 §19). */
const MAX_FREE_PATTERNS = 2;
/** Enough to demonstrate the Free/Pro split without an exhaustive pattern catalogue (Phase 9 §19). */
const MAX_TOTAL_PATTERNS = 5;

interface CandidateEntry {
  evaluated: EvaluatedPattern;
  patternType: BassPatternType;
  anchor: RootAnchor;
}

/** Prefer the root anchor with the lower fret (more immediately accessible); ties favor the E string, matching common bass convention of thinking "low string first." */
function pickPrimaryAnchor(anchors: RootAnchor[]): { primary: RootAnchor; secondary: RootAnchor } {
  const [eStringAnchor, aStringAnchor] = anchors;
  const primary = eStringAnchor.fret <= aStringAnchor.fret ? eStringAnchor : aStringAnchor;
  const secondary = primary === eStringAnchor ? aStringAnchor : eStringAnchor;
  return { primary, secondary };
}

/**
 * Every practical bass navigation pattern offered for `chord` (Phase 9
 * §4/§9/§19): a small, deterministic recipe family (`patternGeneration.ts`)
 * anchored at the two standard root positions (Phase 9 §13), filtered for
 * physical playability (`playability.ts`), passed through a near-duplicate
 * check (`diversity.ts`), and split into Free (the basic ascending
 * arpeggio and the alternative-position pattern, always in that order when
 * both exist — Phase 9 §9's "1. Basic ascending arpeggio, 2. Another
 * practical root-based pattern") vs Pro (the root-5th-octave skeleton and
 * the descending mirror, ranked). Returns an empty array — never a
 * fabricated pattern — when nothing playable is found (Phase 9 §12).
 */
export function bassPatternsFor(chord: Chord): BassPattern[] {
  const { primary, secondary } = pickPrimaryAnchor(rootAnchors(chord));

  const freeEntries: CandidateEntry[] = [];

  const basicSteps = buildAscendingSteps(chord, primary);
  if (basicSteps) {
    const evaluated = evaluatePattern(basicSteps);
    if (evaluated) freeEntries.push({ evaluated, patternType: "basicArpeggio", anchor: primary });
  }

  const alternativeSteps = buildAscendingSteps(chord, secondary);
  if (alternativeSteps) {
    const evaluated = evaluatePattern(alternativeSteps);
    if (evaluated) freeEntries.push({ evaluated, patternType: "alternativePosition", anchor: secondary });
  }

  const proCandidates: CandidateEntry[] = [];

  const rootFifthSteps = buildRootFifthOctaveSteps(chord, primary);
  if (rootFifthSteps) {
    const evaluated = evaluatePattern(rootFifthSteps);
    if (evaluated) proCandidates.push({ evaluated, patternType: "rootFifthOctave", anchor: primary });
  }

  const basicEntry = freeEntries.find((entry) => entry.patternType === "basicArpeggio");
  if (basicEntry) {
    proCandidates.push({
      evaluated: { ...basicEntry.evaluated, steps: reverseSteps(basicEntry.evaluated.steps) },
      patternType: "descendingArpeggio",
      anchor: primary,
    });
  }

  const scoredPro = proCandidates
    .map((entry) => ({ entry, score: scorePattern(entry.evaluated) }))
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.entry);

  const diversePro = diversityFilter(scoredPro, (entry) => entry.evaluated, freeEntries);

  const entries = [...freeEntries, ...diversePro].slice(0, MAX_TOTAL_PATTERNS);

  return entries.map((entry, index) => {
    const catalogue: VoicingCatalogue = index < MAX_FREE_PATTERNS ? "free" : "pro";
    return {
      id: `${entry.patternType}-${index}`,
      chord,
      steps: entry.evaluated.steps,
      patternType: entry.patternType,
      rootString: entry.anchor.string,
      rootFret: entry.anchor.fret,
      fretSpan: entry.evaluated.fretSpan,
      catalogue,
    };
  });
}
