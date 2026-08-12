import type { EvaluatedPattern } from "./playability";

/**
 * Phase 9 §20 — a lightweight, deterministic diversity check. Because
 * patterns are recipe-generated (a handful of well-defined families, not a
 * combinatorial search) rather than searched, exact duplicates are rare by
 * construction — but this guards the edge cases (e.g. a chord whose two
 * root anchors happen to resolve to the same physical route) so the
 * catalogue never wastes a slot on a pattern that plays identically to one
 * already kept. Two patterns are near-duplicates when they visit the exact
 * same (string, fret) sequence, regardless of pattern-type label.
 */
export function isNearDuplicate(a: EvaluatedPattern, b: EvaluatedPattern): boolean {
  if (a.steps.length !== b.steps.length) return false;
  return a.steps.every((step, index) => step.string === b.steps[index].string && step.fret === b.steps[index].fret);
}

/**
 * Keeps the first (best-ranked, since candidates must already be sorted)
 * representative of each near-duplicate cluster. `alreadyKept` lets
 * already-committed patterns (e.g. the Free picks) suppress a Pro
 * candidate that would just replay the same route.
 */
export function diversityFilter<T>(
  candidates: T[],
  getEvaluated: (item: T) => EvaluatedPattern,
  alreadyKept: T[] = [],
): T[] {
  const kept: T[] = [...alreadyKept];
  const result: T[] = [];
  for (const candidate of candidates) {
    const isDuplicate = kept.some((existing) => isNearDuplicate(getEvaluated(candidate), getEvaluated(existing)));
    if (isDuplicate) continue;
    kept.push(candidate);
    result.push(candidate);
  }
  return result;
}
