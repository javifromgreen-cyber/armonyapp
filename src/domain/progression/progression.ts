import type { TimeSignature } from "./types";

export const DEFAULT_BPM = 90;
export const MIN_BPM = 20;
export const MAX_BPM = 300;

export const DEFAULT_TIME_SIGNATURE: TimeSignature = "4/4";

export const DEFAULT_DURATION_BEATS = 4;

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}
