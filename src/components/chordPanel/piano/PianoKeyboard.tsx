"use client";

import { useMemo } from "react";
import { noteName, noteToPitchClass } from "@/domain/notes";
import {
  computeKeyboardLayout,
  keyboardRangeForPitches,
  type KeyPosition,
} from "@/domain/instruments/piano";
import type { PlayablePitch } from "@/domain/instruments";

export interface PianoKeyboardProps {
  /** The exact voicing to display — real pitches at real octaves, not just pitch classes (Phase 7 §5). */
  pitches: PlayablePitch[];
  /** The chord's root pitch class, so the root key can be visually distinguished from the other chord tones without relying on color alone (Phase 7 §21). */
  rootPitchClass: number;
  /** Semitones of empty keyboard shown on each side of the voicing — tighter on mobile, wider on desktop (Phase 7 §20). */
  paddingSemitones: number;
  ariaLabel: string;
}

const WHITE_KEY_HEIGHT = 4.2;
const BLACK_KEY_HEIGHT = 2.6;
const LABEL_FONT_SIZE = 0.24;

/**
 * A clean, modern piano keyboard — no skeuomorphic wood/photorealism (Phase
 * 7 §21) — showing only the local range around the current voicing, never a
 * full 88-key keyboard. Highlights are per-PITCH (real octave), not merely
 * "this pitch class somewhere" — switching voicing/inversion moves the
 * highlighted keys, it doesn't just relabel the same ones.
 */
export function PianoKeyboard({
  pitches,
  rootPitchClass,
  paddingSemitones,
  ariaLabel,
}: PianoKeyboardProps) {
  const { layout, highlightedByMidi, rootMidi } = useMemo(() => {
    const range = keyboardRangeForPitches(pitches, paddingSemitones);
    const layout = computeKeyboardLayout(range.minMidi, range.maxMidi);
    const highlightedByMidi = new Map(pitches.map((p) => [p.midi, p]));
    const rootPitch = pitches.find((p) => noteToPitchClass(p.note) === rootPitchClass);
    return { layout, highlightedByMidi, rootMidi: rootPitch?.midi };
  }, [pitches, rootPitchClass, paddingSemitones]);

  function renderKey(key: KeyPosition, isBlack: boolean) {
    const pitch = highlightedByMidi.get(key.midi);
    const isRoot = key.midi === rootMidi;
    const height = isBlack ? BLACK_KEY_HEIGHT : WHITE_KEY_HEIGHT;
    const baseFill = isBlack ? "#18181a" : "#f4f2ee";
    const baseStroke = isBlack ? "#000000" : "#c7c5c0";

    return (
      <g key={key.midi}>
        <rect
          x={key.x}
          y={0}
          width={key.width}
          height={height}
          rx={0.06}
          style={{ fill: baseFill, stroke: baseStroke, strokeWidth: 0.03 }}
        />
        {pitch && (
          <>
            <rect
              x={key.x + key.width * 0.08}
              y={height * 0.52}
              width={key.width * 0.84}
              height={height * 0.4}
              rx={0.05}
              style={{
                fill: "var(--color-accent)",
                opacity: isBlack ? 0.85 : 0.65,
              }}
            />
            {isRoot && (
              <circle
                cx={key.x + key.width / 2}
                cy={height * 0.6}
                r={key.width * 0.16}
                style={{ fill: isBlack ? "#f4f2ee" : "#0b0c0f" }}
              />
            )}
            <text
              x={key.x + key.width / 2}
              y={height * 0.88}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              className="select-none font-medium"
              style={{ fill: isBlack ? "#f4f2ee" : "#0b0c0f" }}
            >
              {noteName(pitch.note)}
            </text>
          </>
        )}
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${layout.totalWidth} ${WHITE_KEY_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      className="block h-auto w-full"
    >
      {layout.whiteKeys.map((key) => renderKey(key, false))}
      {layout.blackKeys.map((key) => renderKey(key, true))}
    </svg>
  );
}
