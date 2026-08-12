import type { EvaluatedVoicing } from "./playability";

/**
 * Deterministic scoring (Phase 8 §26) — higher is better, no LLM/heuristic
 * guessing. Documented factors:
 *   + open strings used (easier to play)
 *   + root present in the voicing
 *   + more distinct chord tones sounding (fuller harmony)
 *   + more sounding strings, weighted x2 — "balanced distribution" (a full,
 *     even-sounding chord beats a thin 3-string fragment)
 *   - wider fret span (harder stretch)
 *   - more independent fretting fingers, weighted x3 (harder shape, but a
 *     legitimate barre chord only costs 1 finger for the whole bar, so this
 *     must not dominate the score — see the F-major note below)
 *   - higher fretboard position (less immediately accessible — Phase 8 §28)
 *   - muted strings sandwiched between sounding strings, weighted x10 —
 *     "awkward string skipping": a muted string trapped between two sounding
 *     strings is hard to damp cleanly mid-strum and reads as an accident,
 *     not a real chord shape a guitarist would choose
 *   + root position (bass note is the chord's own root), a modest +8 —
 *     Phase 8.1 §2: a deliberate tie-breaker, not a hard requirement. It's
 *     sized to flip the ranking only between otherwise-comparable
 *     candidates (e.g. the same shape with the low string muted vs. left
 *     ringing open, a few points apart), never to drag a genuinely awkward
 *     root-position shape above a clearly better inversion — the fretSpan
 *     (x6) and fingerCount (x3) penalties still dominate for real
 *     playability gaps. Inversions remain fully valid and often win on
 *     their own merits (openness, low fret, fewer fingers).
 *
 * Tuning note: an earlier version weighted fingerCount at x5 and
 * mutedInteriorCount at x4 with sounding strings at x1. For F major, that
 * ranked a 3-string fragment (x0xx11 — A open, then only the top two
 * strings fretted, skipping over two muted interior strings) above the
 * standard 6-string barre shape (133211), because saving 3 fingers
 * outweighed a mere 2-string muted-interior penalty. Live browser
 * verification (Phase 8 §35) caught this — the top-ranked F voicing didn't
 * look like "F" to a guitarist. Rebalancing toward fuller, less-gapped
 * voicings surfaces recognizable barre/compact shapes (e.g. xx3211-style
 * partials, or the full barre) for F, Bb, Dbmaj7, and other non-curated
 * chords without changing which shape wins for curated chords (those are
 * always ranked first regardless of score).
 */
export function scoreVoicing(
  evaluated: EvaluatedVoicing,
  rootPresent: boolean,
  distinctToneCount: number,
  isRootPosition: boolean,
): number {
  let score = 100;
  score += evaluated.openStringCount * 4;
  score += rootPresent ? 15 : 0;
  score += distinctToneCount * 3;
  score += evaluated.soundingStringCount * 2;
  score += isRootPosition ? 8 : 0;
  score -= evaluated.fretSpan * 6;
  score -= evaluated.fingerCount * 3;
  score -= evaluated.baseFret * 2;
  score -= evaluated.mutedInteriorCount * 10;
  return score;
}
