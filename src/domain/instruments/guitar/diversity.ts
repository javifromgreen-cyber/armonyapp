import type { EvaluatedVoicing } from "./playability";

/**
 * Phase 8.1 §6/§7 — a lightweight, deterministic diversity pass so the
 * surfaced catalogue doesn't fill up with several shapes that differ only
 * trivially from one another. Two voicings count as "near-duplicates" when
 * ALL of the following hold:
 *   - same inversion (same chord tone in the bass);
 *   - base fret within 2 frets of each other (same neck region);
 *   - fret pattern differs on at most 1 of the 6 strings (e.g. only whether
 *     one extra string is muted or left ringing open).
 * This is deliberately simple and fully deterministic (no clustering/ML),
 * and it compares FRET PATTERNS, never sounding pitch-class sets — two
 * voicings that happen to sound the same pitch classes but use genuinely
 * different shapes, positions, or string sets are NOT collapsed. The goal
 * is catalogue usefulness (don't waste a slot on a near-copy), not
 * theoretical pitch-class uniqueness.
 */
export function isNearDuplicate(
  a: EvaluatedVoicing,
  aInversion: number,
  b: EvaluatedVoicing,
  bInversion: number,
): boolean {
  if (aInversion !== bInversion) return false;
  if (Math.abs(a.baseFret - b.baseFret) > 2) return false;
  return fretPatternDistance(a, b) <= 1;
}

function fretPatternDistance(a: EvaluatedVoicing, b: EvaluatedVoicing): number {
  let distance = 0;
  for (let i = 0; i < a.strings.length; i++) {
    if (stringKey(a.strings[i]) !== stringKey(b.strings[i])) distance++;
  }
  return distance;
}

function stringKey(sound: EvaluatedVoicing["strings"][number]): string {
  return sound.state.status === "fretted" ? `f${sound.state.fret}` : sound.state.status;
}

/**
 * Greedily keeps the highest-ranked representative of each near-duplicate
 * cluster. `candidates` must already be sorted best-first — the first
 * candidate in any cluster is the one kept. `alreadyKept` lets shapes that
 * bypass scoring entirely (curated open shapes) suppress generated
 * near-duplicates of themselves too, so a generated copy of the curated
 * shape never wastes a second catalogue slot.
 */
export function diversityFilter<T>(
  candidates: T[],
  getEvaluated: (item: T) => EvaluatedVoicing,
  getInversion: (item: T) => number,
  alreadyKept: T[] = [],
): T[] {
  const kept: T[] = [...alreadyKept];
  const result: T[] = [];
  for (const candidate of candidates) {
    const isDuplicate = kept.some((existing) =>
      isNearDuplicate(
        getEvaluated(candidate),
        getInversion(candidate),
        getEvaluated(existing),
        getInversion(existing),
      ),
    );
    if (isDuplicate) continue;
    kept.push(candidate);
    result.push(candidate);
  }
  return result;
}
