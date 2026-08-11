import { mod12 } from "../../notes/pitchClass";
import type { PlayablePitch } from "../playablePitch";

const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]); // C D E F G A B
const BLACK_KEY_WIDTH = 0.62;

function isWhiteMidi(midi: number): boolean {
  return WHITE_PITCH_CLASSES.has(mod12(midi));
}

export interface KeyPosition {
  midi: number;
  /** Left edge, in white-key-width units (a white key is exactly 1 unit wide). */
  x: number;
  width: number;
}

export interface KeyboardLayout {
  whiteKeys: KeyPosition[];
  blackKeys: KeyPosition[];
  /** Total width in the same white-key-width units — the SVG viewBox width. */
  totalWidth: number;
}

/**
 * Pure keyboard geometry (Phase 7 §5/§20) — no DOM/SVG, so it's unit-testable
 * without rendering. White keys are laid out sequentially left to right; each
 * black key is positioned centered on the boundary between its two adjacent
 * white keys (the standard piano layout — every black key sits between
 * exactly one white-key pair, since no black key exists between E/F or B/C).
 */
export function computeKeyboardLayout(minMidi: number, maxMidi: number): KeyboardLayout {
  const whiteKeys: KeyPosition[] = [];
  const blackKeys: KeyPosition[] = [];
  const whiteIndexByMidi = new Map<number, number>();
  let whiteIndex = 0;

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    if (isWhiteMidi(midi)) {
      whiteIndexByMidi.set(midi, whiteIndex);
      whiteKeys.push({ midi, x: whiteIndex, width: 1 });
      whiteIndex += 1;
    }
  }

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    if (!isWhiteMidi(midi)) {
      const leftWhiteIndex = whiteIndexByMidi.get(midi - 1);
      if (leftWhiteIndex === undefined) continue; // black key at the very edge of the range with no white neighbor inside it
      blackKeys.push({ midi, x: leftWhiteIndex + 1 - BLACK_KEY_WIDTH / 2, width: BLACK_KEY_WIDTH });
    }
  }

  return { whiteKeys, blackKeys, totalWidth: whiteIndex };
}

/**
 * The MIDI range to render around a voicing (Phase 7 §20): the voicing's own
 * span padded by `paddingSemitones` on each side, snapped outward to the
 * nearest white key so the keyboard never starts or ends mid-black-key.
 * Callers pass a tighter padding on mobile, wider on desktop.
 */
export function keyboardRangeForPitches(
  pitches: PlayablePitch[],
  paddingSemitones: number,
): { minMidi: number; maxMidi: number } {
  const midis = pitches.map((p) => p.midi);
  let minMidi = Math.min(...midis) - paddingSemitones;
  let maxMidi = Math.max(...midis) + paddingSemitones;
  while (!isWhiteMidi(minMidi)) minMidi -= 1;
  while (!isWhiteMidi(maxMidi)) maxMidi += 1;
  return { minMidi, maxMidi };
}
