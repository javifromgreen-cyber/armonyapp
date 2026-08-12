import type { BassPatternStep } from "./types";

/**
 * Max fret span across a pattern's fretted notes (Phase 9 §14). Bass frets
 * are noticeably wider apart than guitar's — reusing guitar's span limit
 * unchanged would understate real stretch difficulty, so this is
 * deliberately bass-specific rather than shared. A span this size, paired
 * with the 1-2-4 fingering convention below, stays within a genuinely
 * comfortable low-position stretch; wider spans are rejected rather than
 * fabricated into an unrealistic pattern.
 */
export const MAX_FRET_SPAN = 5;

export interface EvaluatedPattern {
  steps: BassPatternStep[];
  /** Span among fretted (non-open) steps only — open strings never inflate this, mirroring Guitar's convention. */
  fretSpan: number;
  /** The lowest fret used by any fretted step; 0 when the pattern uses no fretted note (all opens). */
  baseFret: number;
}

/**
 * Turns a raw ordered step sequence into a physically evaluated pattern,
 * or `undefined` if its fret span exceeds what a hand can comfortably
 * cover (Phase 9 §12/§14) — never fabricates an unplayable pattern.
 * Assigns suggested fingering as a side effect (mutates `steps` in place)
 * since fingering depends on the pattern's own base fret.
 */
export function evaluatePattern(steps: BassPatternStep[]): EvaluatedPattern | undefined {
  const frettedFrets = steps.map((s) => s.fret).filter((f) => f > 0);
  const fretSpan = frettedFrets.length > 0 ? Math.max(...frettedFrets) - Math.min(...frettedFrets) : 0;
  if (fretSpan > MAX_FRET_SPAN) return undefined;

  const baseFret = frettedFrets.length > 0 ? Math.min(...frettedFrets) : 0;
  assignFingers(steps, baseFret);

  return { steps, fretSpan, baseFret };
}

/**
 * Suggested fingering (Phase 9 §15): bass frets are wide enough that a
 * strict one-finger-per-fret (1-2-3-4) stretch is uncomfortable for most
 * hands below roughly the 5th fret, where bassists conventionally use a
 * "1-2-4" system instead — index and middle cover the first two frets of
 * the position, then the little finger (not the ring finger) reaches the
 * 3rd relative fret, since bridging index/middle/ring/pinky across four
 * WIDE low-position frets is a genuine overstretch for most hands. From
 * roughly the 5th fret up, frets are close enough together that standard
 * one-finger-per-fret (1-2-3-4) applies. A relative fret 4 or more beyond
 * the base fret is not confidently suggestable either way and is omitted
 * (Phase 9 §15's "if uncertain, omit the recommendation") rather than
 * guessed. Open strings never take a finger number.
 */
function assignFingers(steps: BassPatternStep[], baseFret: number): void {
  const useOneTwoFourSystem = baseFret < 5;
  for (const step of steps) {
    if (step.fret === 0) {
      step.finger = undefined;
      continue;
    }
    const relativeFret = step.fret - baseFret;
    if (relativeFret === 0) step.finger = 1;
    else if (relativeFret === 1) step.finger = 2;
    else if (relativeFret === 2) step.finger = useOneTwoFourSystem ? 4 : 3;
    else if (relativeFret === 3) step.finger = 4;
    else step.finger = undefined;
  }
}
