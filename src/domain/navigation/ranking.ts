import type { Chord } from "../chords/chord";
import type { Key } from "../keys/key";
import { chordsEqual } from "../harmony/chordIdentity";
import { classifyFunction } from "../harmony/harmonicFunction";
import type { Progression } from "../progression/types";
import type { NavigationOption, NavigationPath, RankedNavigationOption } from "./types";

/**
 * The two chords contextual ranking needs: the current endpoint (what we're
 * ranking outgoing options FROM) and, if any, the chord immediately before
 * it in whichever history is authoritative for this endpoint (Phase R3
 * §18/§22) — used to recognize short functional patterns like a ii-V
 * approach reinforcing V's resolution to I.
 */
export interface HistoryContext {
  context: Key;
  endpoint: Chord;
  previousChord: Chord | undefined;
}

/**
 * Phase R3 §22's precedence rule: if the actual progression's last chord
 * matches the current exploration endpoint, the real composed progression
 * (not just the exploration path) is the strongest signal for "what came
 * before" — the user has already committed that history to their
 * composition. Otherwise, fall back to the exploration path itself.
 */
export function resolveHistoryContext(
  navPath: NavigationPath,
  progression: Progression,
  context: Key,
): HistoryContext {
  const endpoint = navPath.steps[navPath.steps.length - 1].chord;
  const progressionChords = progression.items.map((item) => item.chord);
  const lastProgressionChord = progressionChords[progressionChords.length - 1];

  if (lastProgressionChord && chordsEqual(lastProgressionChord, endpoint)) {
    return {
      context,
      endpoint,
      previousChord: progressionChords[progressionChords.length - 2],
    };
  }

  return {
    context,
    endpoint,
    previousChord: navPath.steps[navPath.steps.length - 2]?.chord,
  };
}

const DOMINANT_RESOLUTION_BONUS = 0.15;
const PREDOMINANT_TO_DOMINANT_BONUS = 0.1;
const REINFORCED_CADENCE_BONUS = 0.1;

/**
 * A small, explicitly-documented bonus on top of the relationship's own
 * `strength` — grounded entirely in the existing `classifyFunction` domain
 * query (tonic/predominant/dominant), never an invented per-component
 * heuristic. This can only reorder `options`; it never changes which chords
 * are present (Phase R3 §3/§18 — "ranking organizes, never deletes"), since
 * `rankOptions` below maps the same input array 1:1.
 */
function contextualBonus(option: NavigationOption, history: HistoryContext): number {
  const endpointFunction = classifyFunction(history.endpoint, history.context);
  const targetFunction = classifyFunction(option.chord, history.context);
  let bonus = 0;

  if (endpointFunction === "dominant" && targetFunction === "tonic") {
    bonus += DOMINANT_RESOLUTION_BONUS;
  }
  if (endpointFunction === "predominant" && targetFunction === "dominant") {
    bonus += PREDOMINANT_TO_DOMINANT_BONUS;
  }

  // Reinforced ii-V-I: arriving at a predominant chord FROM the tonic (e.g.
  // C -> Am -> Dm) reads as a stronger cadential approach than reaching the
  // same predominant chord cold — so its dominant targets (Dm -> G7) gain a
  // further boost on top of the plain predominant->dominant bonus above.
  if (history.previousChord && endpointFunction === "predominant" && targetFunction === "dominant") {
    const previousFunction = classifyFunction(history.previousChord, history.context);
    if (previousFunction === "tonic") {
      bonus += REINFORCED_CADENCE_BONUS;
    }
  }

  return bonus;
}

/**
 * Reorders `options` by contextual relevance (Phase R3 §18/§19) — same
 * membership, always (structurally guaranteed: this is a map + sort over
 * the exact input array, nothing is filtered). Ties fall back to the
 * relationship's own `strength`, then chord root pitch class for a fully
 * deterministic order.
 */
export function rankOptions(
  options: NavigationOption[],
  history: HistoryContext,
): RankedNavigationOption[] {
  return options
    .map((option) => ({
      ...option,
      contextScore: option.primaryRelationship.strength + contextualBonus(option, history),
    }))
    .sort((a, b) => {
      if (b.contextScore !== a.contextScore) return b.contextScore - a.contextScore;
      return b.primaryRelationship.strength - a.primaryRelationship.strength;
    });
}
