"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { noteToPitchClass } from "@/domain/notes";
import { guitarVoicingsFor, tabLinesFor, type GuitarVoicing } from "@/domain/instruments/guitar";
import type { Chord } from "@/domain/chords";
import { GuitarDiagram } from "./GuitarDiagram";
import { useAsyncTrigger } from "../../audio/useAsyncTrigger";

export interface GuitarVoicingPanelProps {
  chord: Chord;
  onHearVoicing: (voicing: GuitarVoicing) => Promise<void>;
}

function positionLabelKey(voicing: GuitarVoicing): string {
  if (voicing.strings.some((s) => s.state.status === "open")) return "openPosition";
  if (voicing.barre) return "movableShape";
  return "positionVoicing";
}

function inversionLabelKey(inversion: number): string | undefined {
  if (inversion === 0) return "rootPosition";
  if (inversion <= 3) return `inversion${inversion}`;
  return undefined; // an inversion this deep (5-tone chord, bass on the 9th) has no dedicated label — omit rather than mislabel
}

/**
 * The GUITAR section of the chord panel (Phase 8 §21) — diagram, voicing
 * navigator, suggested fingering (shown directly on the diagram, plus a
 * compact summary line), TAB, and "Hear this voicing". Renders directly
 * inside `ChordContextPanel` alongside Piano — no separate guitar page.
 * Resets to the first (best-ranked) voicing whenever `chord` changes
 * because the parent remounts this component via `key={chordSymbol(chord)}`.
 */
export function GuitarVoicingPanel({ chord, onHearVoicing }: GuitarVoicingPanelProps) {
  const t = useTranslations("app.guitar");
  const [voicingIndex, setVoicingIndex] = useState(0);
  const { run: hearVoicing, isPending: isPreparingSound } = useAsyncTrigger(onHearVoicing);

  const voicings = useMemo(() => guitarVoicingsFor(chord), [chord]);
  const rootPitchClass = noteToPitchClass(chord.root);

  if (voicings.length === 0) {
    return (
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {t("title")}
        </h3>
        <p className="mt-2 text-sm text-foreground-muted">{t("noSuitableVoicing")}</p>
      </section>
    );
  }

  const voicing = voicings[Math.min(voicingIndex, voicings.length - 1)];

  function goTo(index: number) {
    setVoicingIndex(((index % voicings.length) + voicings.length) % voicings.length);
  }

  const tabLines = tabLinesFor(voicing);
  const fingerSummary = voicing.strings
    .map((s) => (s.state.status === "fretted" ? s.state.finger : s.state.status === "open" ? "o" : "x"))
    .join(" · ");
  const noteSummary = voicing.strings
    .filter((s) => s.pitch)
    .map((s) => `${s.pitch!.note.letter}${s.pitch!.octave}`)
    .join(", ");

  const inversionKey = inversionLabelKey(voicing.inversion);

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {t("title")}
      </h3>

      <div className="mt-2 rounded-xl border border-border bg-surface-raised p-3">
        <h4 className="text-center text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
          {t("fingeringDiagramHeading")}
        </h4>
        <GuitarDiagram
          voicing={voicing}
          rootPitchClass={rootPitchClass}
          ariaLabel={t("diagramAriaLabel", { notes: noteSummary })}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goTo(voicingIndex - 1)}
            disabled={voicings.length <= 1}
            aria-label={t("previousVoicing")}
            className="rounded-full border border-border px-2.5 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            ‹
          </button>

          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-foreground">
              {t(positionLabelKey(voicing), { fret: voicing.baseFret })}
            </span>
            {inversionKey && (
              <span className="text-xs text-foreground-muted">{t(inversionKey)}</span>
            )}
            <span className="text-xs text-foreground-muted">
              {t("voicingCounter", { current: voicingIndex + 1, total: voicings.length })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => goTo(voicingIndex + 1)}
            disabled={voicings.length <= 1}
            aria-label={t("nextVoicing")}
            className="rounded-full border border-border px-2.5 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-foreground-muted">
          {t("suggestedFingering")}: {fingerSummary}
        </p>

        <h4 className="mt-3 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
          {t("tab")}
        </h4>
        <div className="mt-1 rounded-lg bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-foreground-muted">
          {tabLines.map((line, index) => (
            <div key={`${line.label}-${index}`}>
              {line.label}|--{line.symbol}--
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => hearVoicing(voicing)}
          disabled={isPreparingSound}
          className="mt-3 w-full rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {isPreparingSound ? t("preparingSound") : t("hearThisVoicing")}
        </button>
      </div>
    </section>
  );
}
