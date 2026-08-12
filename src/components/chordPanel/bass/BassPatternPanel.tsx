"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { noteToPitchClass } from "@/domain/notes";
import { bassPatternsFor, tabLinesFor, type BassPattern } from "@/domain/instruments/bass";
import type { Chord } from "@/domain/chords";
import { BassFretboard } from "./BassFretboard";

export interface BassPatternPanelProps {
  chord: Chord;
  isDesktop: boolean;
  onHearPattern: (pattern: BassPattern) => void;
}

function positionLabelKey(pattern: BassPattern): string {
  if (pattern.patternType === "basicArpeggio") return "basicArpeggio";
  if (pattern.patternType === "descendingArpeggio") return "descendingArpeggio";
  if (pattern.patternType === "alternativePosition") return "alternativePosition";
  return "ascendingArpeggio"; // rootFifthOctave — a shorter ascending route, no dedicated label
}

/**
 * The BASS section of the chord panel (Phase 9 §27) — a local fretboard,
 * pattern navigator, interval sequence, suggested fingering, TAB, and
 * "Hear this pattern". Renders directly inside `ChordContextPanel`
 * alongside Piano/Guitar — no separate bass page. Resets to the first
 * (best) pattern whenever `chord` changes because the parent remounts this
 * component via `key={chordSymbol(chord)}`.
 */
export function BassPatternPanel({ chord, isDesktop, onHearPattern }: BassPatternPanelProps) {
  const t = useTranslations("app.bass");
  const [patternIndex, setPatternIndex] = useState(0);

  const patterns = useMemo(() => bassPatternsFor(chord), [chord]);
  const rootPitchClass = noteToPitchClass(chord.root);

  if (patterns.length === 0) {
    return (
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{t("title")}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t("noSuitablePattern")}</p>
      </section>
    );
  }

  const pattern = patterns[Math.min(patternIndex, patterns.length - 1)];

  function goTo(index: number) {
    setPatternIndex(((index % patterns.length) + patterns.length) % patterns.length);
  }

  const tabLines = tabLinesFor(pattern);
  const intervalSequence = pattern.steps.map((s) => s.intervalToken).join(" → ");
  const fingerSummary = pattern.steps.map((s) => (s.finger ? s.finger : "o")).join(" · ");
  const noteSummary = pattern.steps.map((s) => `${s.pitch.note.letter}${s.pitch.octave}`).join(", ");

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{t("title")}</h3>

      <div className="mt-2 rounded-xl border border-border bg-surface-raised p-3">
        <BassFretboard
          chord={chord}
          pattern={pattern}
          rootPitchClass={rootPitchClass}
          isDesktop={isDesktop}
          ariaLabel={t("fretboardAriaLabel", { notes: noteSummary })}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goTo(patternIndex - 1)}
            disabled={patterns.length <= 1}
            aria-label={t("previousPattern")}
            className="rounded-full border border-border px-2.5 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            ‹
          </button>

          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-foreground">
              {t(positionLabelKey(pattern))}
              {pattern.catalogue === "pro" && (
                <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                  {t("proBadge")}
                </span>
              )}
            </span>
            <span className="text-xs text-foreground-muted">
              {t("patternCounter", { current: patternIndex + 1, total: patterns.length })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => goTo(patternIndex + 1)}
            disabled={patterns.length <= 1}
            aria-label={t("nextPattern")}
            className="rounded-full border border-border px-2.5 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <p className="mt-2 text-center font-mono text-sm text-foreground">{intervalSequence}</p>

        <p className="mt-1 text-center text-xs text-foreground-muted">
          {t("suggestedFingering")}: {fingerSummary}
        </p>

        <h4 className="mt-3 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{t("tab")}</h4>
        <div className="mt-1 rounded-lg bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-foreground-muted">
          {tabLines.map((line) => (
            <div key={line.label}>
              {line.label}|{line.cells.map((cell) => cell.padStart(2, "-")).join("-")}|
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onHearPattern(pattern)}
          className="mt-3 w-full rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {t("hearThisPattern")}
        </button>
      </div>
    </section>
  );
}
