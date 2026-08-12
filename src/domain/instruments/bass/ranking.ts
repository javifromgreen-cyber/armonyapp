import type { EvaluatedPattern } from "./playability";

/**
 * Deterministic scoring (Phase 9 §12) — higher is better, no LLM. Bass
 * patterns are a small, recipe-generated set rather than a searched
 * combinatorial space (see `patternGeneration.ts`), so this mainly orders
 * the Pro alternatives sensibly rather than picking a winner out of many
 * near-identical candidates:
 *   - wider fret span (harder stretch)
 *   - higher base fret (less immediately accessible)
 *   - larger jumps between consecutive steps, summed across the pattern
 *     (uneven, less physically coherent motion)
 */
export function scorePattern(evaluated: EvaluatedPattern): number {
  let score = 100;
  score -= evaluated.fretSpan * 6;
  score -= evaluated.baseFret * 2;

  let totalStepJump = 0;
  for (let i = 1; i < evaluated.steps.length; i++) {
    totalStepJump += Math.abs(evaluated.steps[i].fret - evaluated.steps[i - 1].fret);
  }
  score -= totalStepJump;

  return score;
}
