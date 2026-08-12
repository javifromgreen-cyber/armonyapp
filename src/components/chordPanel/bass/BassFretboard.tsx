"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { noteToPitchClass } from "@/domain/notes";
import {
  localChordToneMap,
  type BassPattern,
  type BassFretboardTone,
  type BassStringNumber,
} from "@/domain/instruments/bass";
import type { Chord } from "@/domain/chords";

export interface BassFretboardProps {
  chord: Chord;
  pattern: BassPattern;
  rootPitchClass: number;
  isDesktop: boolean;
  ariaLabel: string;
}

const FRET_SPACING = 0.85;
const STRING_SPACING = 1;
const MARGIN_LEFT = 0.55;
const MARGIN_RIGHT = 0.3;
const MARGIN_TOP = 0.3;
const MARGIN_BOTTOM = 0.55;
const MIN_CELLS = 5;
const AVAILABLE_DOT_RADIUS = 0.15;
const PATTERN_DOT_RADIUS = 0.32;
const STRING_ORDER: readonly BassStringNumber[] = [1, 2, 3, 4]; // G (top) to E (bottom), matching the TAB block below it
const STRING_LABEL: Record<BassStringNumber, string> = { 1: "G", 2: "D", 3: "A", 4: "E" };

/**
 * A compact LOCAL bass fretboard (Phase 9 §7) — 4 strings, a small fret
 * region around the current pattern, never a full 20+ fret neck. Frets run
 * left to right and strings run top (G, thinnest) to bottom (E, thickest),
 * matching the TAB block directly below it — a horizontal layout, unlike
 * Guitar's vertical chord diagram, because a bass PATTERN typically spans
 * more frets than a single guitar chord shape does; a vertical layout for
 * that made the diagram awkwardly tall. String labels sit at the left edge
 * so each row is identifiable without relying on position alone.
 *
 * Two visually distinct layers occupy the same grid (Phase 9 §6): every
 * chord tone reachable in this local region renders as a small, subtle
 * outline marker labeled with its interval token ("these notes belong to
 * the chord"), while the CURRENT pattern's own notes render as large,
 * filled, numbered markers ("this is the route this pattern takes",
 * numbered 1-4+ in play order) — the root additionally gets an outline
 * ring in both layers, never color alone (Phase 9 §34).
 */
export function BassFretboard({ chord, pattern, rootPitchClass, isDesktop, ariaLabel }: BassFretboardProps) {
  const t = useTranslations("app.bass");
  const layout = useMemo(
    () => computeFretboardLayout(chord, pattern, isDesktop),
    [chord, pattern, isDesktop],
  );

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={ariaLabel}
      className="block h-auto w-full"
    >
      {/* string rows + labels */}
      {STRING_ORDER.map((stringNumber, index) => {
        const y = layout.stringYs[index];
        return (
          <g key={`string-${stringNumber}`}>
            <line
              x1={layout.fretLines[0]}
              y1={y}
              x2={layout.fretLines[layout.fretLines.length - 1]}
              y2={y}
              style={{ stroke: "var(--color-border)", strokeWidth: 0.025 }}
            />
            <text
              x={MARGIN_LEFT - 0.15}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={0.26}
              className="select-none font-mono"
              style={{ fill: "var(--color-foreground-muted)" }}
            >
              {STRING_LABEL[stringNumber]}
            </text>
          </g>
        );
      })}

      {/* fret lines */}
      {layout.fretLines.map((x, index) => (
        <line
          key={`fret-${index}`}
          x1={x}
          y1={layout.stringYs[0]}
          x2={x}
          y2={layout.stringYs[layout.stringYs.length - 1]}
          style={{ stroke: "var(--color-border)", strokeWidth: 0.025 }}
        />
      ))}

      {/* position label */}
      <text
        x={layout.fretLines[0]}
        y={layout.height - 0.12}
        textAnchor="start"
        fontSize={0.22}
        className="select-none"
        style={{ fill: "var(--color-foreground-muted)" }}
      >
        {layout.windowMinFret === 0 ? t("openPositionShort") : t("fretPosition", { fret: layout.windowMinFret })}
      </text>

      {/* available chord tones — subtle */}
      {layout.availableTones.map((tone) => {
        const y = layout.stringYs[tone.string - 1];
        const x = layout.fretXByFret.get(tone.fret)!;
        const isRoot = tone.pitchClass === rootPitchClass;
        return (
          <g key={`avail-${tone.string}-${tone.fret}`} opacity={0.6}>
            <title>{t("chordTone", { interval: tone.token })}</title>
            <circle
              cx={x}
              cy={y}
              r={AVAILABLE_DOT_RADIUS}
              style={{
                fill: "var(--color-surface)",
                stroke: isRoot ? "var(--color-accent)" : "var(--color-foreground-muted)",
                strokeWidth: 0.03,
              }}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={0.13}
              className="select-none"
              style={{ fill: "var(--color-foreground-muted)" }}
            >
              {tone.token}
            </text>
          </g>
        );
      })}

      {/* the current pattern's own notes — prominent, numbered */}
      {pattern.steps.map((step, index) => {
        const y = layout.stringYs[step.string - 1];
        const x = layout.fretXByFret.get(step.fret)!;
        const isRoot = noteToPitchClass(step.pitch.note) === rootPitchClass;
        return (
          <g key={`step-${index}`}>
            <title>{t("patternStep", { order: index + 1, interval: step.intervalToken })}</title>
            <circle cx={x} cy={y} r={PATTERN_DOT_RADIUS} style={{ fill: "var(--color-accent)" }} />
            {isRoot && (
              // Root gets a distinct outline ring rather than replacing the
              // step number (Phase 9 §34: root strongly distinguished, but
              // §6 still requires every step's sequence order to stay
              // legible — a triad's closing octave is a root-pitch-class
              // step too, and it still needs its own number).
              <circle
                cx={x}
                cy={y}
                r={PATTERN_DOT_RADIUS + 0.08}
                style={{ fill: "none", stroke: "var(--color-accent-foreground)", strokeWidth: 0.05 }}
              />
            )}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={0.3}
              className="select-none font-semibold"
              style={{ fill: "var(--color-accent-foreground)" }}
            >
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface FretboardLayout {
  width: number;
  height: number;
  stringYs: number[];
  fretLines: number[];
  fretXByFret: Map<number, number>;
  windowMinFret: number;
  availableTones: BassFretboardTone[];
}

function computeFretboardLayout(chord: Chord, pattern: BassPattern, isDesktop: boolean): FretboardLayout {
  const patternFrets = pattern.steps.map((s) => s.fret);
  // A little surrounding context helps show "nearby chord tones", but this
  // stays modest (Phase 9 §7: compact, never a near-full-neck view).
  const padding = isDesktop ? 1 : 0;
  const windowMinFret = Math.max(0, Math.min(...patternFrets) - padding);
  const rawMax = Math.max(...patternFrets) + padding;
  const windowMaxFret = Math.max(rawMax, windowMinFret + MIN_CELLS - 1);
  const cellCount = windowMaxFret - windowMinFret + 1;

  const stringYs = [0, 1, 2, 3].map((index) => MARGIN_TOP + index * STRING_SPACING);
  const fretLines = Array.from({ length: cellCount + 1 }, (_, i) => MARGIN_LEFT + i * FRET_SPACING);

  const fretXByFret = new Map<number, number>();
  for (let fret = windowMinFret; fret <= windowMaxFret; fret++) {
    fretXByFret.set(fret, MARGIN_LEFT + (fret - windowMinFret + 0.5) * FRET_SPACING);
  }

  return {
    width: MARGIN_LEFT + cellCount * FRET_SPACING + MARGIN_RIGHT,
    height: MARGIN_TOP + 3 * STRING_SPACING + MARGIN_BOTTOM,
    stringYs,
    fretLines,
    fretXByFret,
    windowMinFret,
    availableTones: localChordToneMap(chord, windowMinFret, windowMaxFret),
  };
}
