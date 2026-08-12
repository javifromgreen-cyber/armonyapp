"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { noteToPitchClass } from "@/domain/notes";
import type { GuitarVoicing } from "@/domain/instruments/guitar";

export interface GuitarDiagramProps {
  voicing: GuitarVoicing;
  rootPitchClass: number;
  ariaLabel: string;
}

const STRING_SPACING = 1;
const FRET_SPACING = 1;
const MARGIN_TOP = 0.9;
const MARGIN_BOTTOM = 0.35;
const MARGIN_SIDE = 0.4;
const MIN_CELLS = 4;
const DOT_RADIUS = 0.32;
const NUT_HEIGHT = 0.09;

/**
 * A clean, modern chord diagram (Phase 8 §14/§15/§21) — string 6 on the
 * left, string 1 on the right, nut at the top, higher frets downward, per
 * the documented orientation convention (never flipped). Shows only the
 * voicing's own fret range (plus a little headroom), never a full neck.
 */
export function GuitarDiagram({ voicing, rootPitchClass, ariaLabel }: GuitarDiagramProps) {
  const t = useTranslations("app.guitar");
  const layout = useMemo(() => computeDiagramLayout(voicing), [voicing]);

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={ariaLabel}
      className="block h-auto w-full"
    >
      {/* fret lines */}
      {layout.fretLines.map((y, index) => (
        <line
          key={`fret-${index}`}
          x1={MARGIN_SIDE}
          y1={y}
          x2={MARGIN_SIDE + 5 * STRING_SPACING}
          y2={y}
          style={{
            stroke: "var(--color-border)",
            strokeWidth: index === 0 && layout.showNut ? NUT_HEIGHT : 0.025,
          }}
        />
      ))}

      {/* strings */}
      {layout.stringXs.map((x, index) => (
        <line
          key={`string-${index}`}
          x1={x}
          y1={layout.fretLines[0]}
          x2={x}
          y2={layout.fretLines[layout.fretLines.length - 1]}
          style={{ stroke: "var(--color-border)", strokeWidth: 0.025 }}
        />
      ))}

      {/* position label for a non-nut (movable) shape */}
      {!layout.showNut && (
        <text
          x={MARGIN_SIDE - 0.12}
          y={layout.fretLines[0] + FRET_SPACING / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={0.32}
          className="select-none"
          style={{ fill: "var(--color-foreground-muted)" }}
        >
          {layout.firstCellFret}fr
        </text>
      )}

      {/* barre */}
      {layout.barre && (
        <g>
          <title>{t("barre")}</title>
          <rect
            x={layout.barre.x1 - DOT_RADIUS}
            y={layout.barre.y - DOT_RADIUS}
            width={layout.barre.x2 - layout.barre.x1 + DOT_RADIUS * 2}
            height={DOT_RADIUS * 2}
            rx={DOT_RADIUS}
            style={{ fill: "var(--color-accent)" }}
          />
          <text
            x={(layout.barre.x1 + layout.barre.x2) / 2}
            y={layout.barre.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.34}
            className="select-none font-semibold"
            style={{ fill: "var(--color-accent-foreground)" }}
          >
            {layout.barre.finger}
          </text>
        </g>
      )}

      {/* open / muted markers above the nut, and fretted dots */}
      {layout.strings.map((entry, index) => {
        const x = layout.stringXs[index];
        const isRoot = entry.pitchClass === rootPitchClass;
        const markerY = layout.fretLines[0] - MARGIN_TOP * 0.5;

        if (entry.status === "muted") {
          return (
            <text
              key={entry.string}
              x={x}
              y={markerY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={0.4}
              className="select-none"
              style={{ fill: "var(--color-foreground-muted)" }}
            >
              <title>{t("mutedString")}</title>×
            </text>
          );
        }

        if (entry.status === "open") {
          return (
            <g key={entry.string}>
              <title>{t("openString")}</title>
              <circle
                cx={x}
                cy={markerY}
                r={0.18}
                style={{
                  fill: "none",
                  stroke: isRoot ? "var(--color-accent)" : "var(--color-foreground-muted)",
                  strokeWidth: 0.045,
                }}
              />
              {isRoot && <circle cx={x} cy={markerY} r={0.08} style={{ fill: "var(--color-accent)" }} />}
            </g>
          );
        }

        // fretted, and not covered by the barre bar drawn above
        if (entry.coveredByBarre) return null;

        const y = layout.fretYByFret.get(entry.fret!)!;
        return (
          <g key={entry.string}>
            <circle cx={x} cy={y} r={DOT_RADIUS} style={{ fill: "var(--color-accent)" }} />
            {isRoot && (
              <circle cx={x} cy={y} r={DOT_RADIUS * 0.35} style={{ fill: "var(--color-accent-foreground)" }} />
            )}
            {entry.finger && !isRoot && (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.34}
                className="select-none font-semibold"
                style={{ fill: "var(--color-accent-foreground)" }}
              >
                {entry.finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface DiagramStringEntry {
  string: number;
  status: "muted" | "open" | "fretted";
  fret?: number;
  finger?: number;
  pitchClass?: number;
  coveredByBarre: boolean;
}

interface DiagramLayout {
  width: number;
  height: number;
  stringXs: number[];
  fretLines: number[];
  fretYByFret: Map<number, number>;
  showNut: boolean;
  firstCellFret: number;
  strings: DiagramStringEntry[];
  barre?: { x1: number; x2: number; y: number; finger: number };
}

function computeDiagramLayout(voicing: GuitarVoicing): DiagramLayout {
  const showNut = voicing.baseFret <= 3 || voicing.fretSpan === 0;
  const firstCellFret = showNut ? 1 : voicing.baseFret;
  const maxFretUsed = voicing.baseFret + voicing.fretSpan;
  const cellCount = Math.max(MIN_CELLS, maxFretUsed - firstCellFret + 1);

  const stringXs = voicing.strings.map((_, index) => MARGIN_SIDE + index * STRING_SPACING);
  const fretLines = Array.from({ length: cellCount + 1 }, (_, i) => MARGIN_TOP + i * FRET_SPACING);

  const fretYByFret = new Map<number, number>();
  for (let fret = firstCellFret; fret <= firstCellFret + cellCount - 1; fret++) {
    fretYByFret.set(fret, MARGIN_TOP + (fret - firstCellFret + 0.5) * FRET_SPACING);
  }

  const barredStrings = new Set(voicing.barre?.strings ?? []);
  const strings: DiagramStringEntry[] = voicing.strings.map((sound) => ({
    string: sound.string,
    status: sound.state.status,
    fret: sound.state.status === "fretted" ? sound.state.fret : undefined,
    finger: sound.state.status === "fretted" ? sound.state.finger : undefined,
    pitchClass: sound.pitch ? noteToPitchClass(sound.pitch.note) : undefined,
    coveredByBarre:
      sound.state.status === "fretted" &&
      voicing.barre !== undefined &&
      sound.state.fret === voicing.barre.fret &&
      barredStrings.has(sound.string),
  }));

  const barre = voicing.barre
    ? {
        x1: stringXs[voicing.strings.findIndex((s) => s.string === Math.max(...voicing.barre!.strings))],
        x2: stringXs[voicing.strings.findIndex((s) => s.string === Math.min(...voicing.barre!.strings))],
        y: fretYByFret.get(voicing.barre.fret)!,
        finger: voicing.barre.finger,
      }
    : undefined;

  return {
    width: MARGIN_SIDE * 2 + 5 * STRING_SPACING,
    height: MARGIN_TOP + cellCount * FRET_SPACING + MARGIN_BOTTOM,
    stringXs,
    fretLines,
    fretYByFret,
    showNut,
    firstCellFret,
    strings,
    barre,
  };
}
