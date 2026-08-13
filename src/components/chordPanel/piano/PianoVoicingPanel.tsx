"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { noteName, noteToPitchClass } from "@/domain/notes";
import { pianoVoicingsFor, type PianoVoicing } from "@/domain/instruments/piano";
import type { Chord } from "@/domain/chords";
import { PianoKeyboard } from "./PianoKeyboard";
import { useAsyncTrigger } from "../../audio/useAsyncTrigger";

export interface PianoVoicingPanelProps {
  chord: Chord;
  isDesktop: boolean;
  onHearVoicing: (voicing: PianoVoicing) => Promise<void>;
}

function voicingLabelKey(voicing: PianoVoicing): string {
  if (voicing.spacing === "open") return "openVoicing";
  if (voicing.inversion === 0) return "rootPosition";
  return `inversion${voicing.inversion}`;
}

/**
 * The PIANO section of the chord panel (Phase 7 §4) — keyboard, voicing
 * navigator, suggested fingering, and "Hear this voicing". Not a separate
 * page: this renders directly inside `ChordContextPanel`, right below the
 * chord identity info, keeping the user in one Explore→Understand→Play
 * screen. Resets to root position whenever `chord` changes because the
 * parent remounts this component via `key={chordSymbol(chord)}`.
 */
export function PianoVoicingPanel({ chord, isDesktop, onHearVoicing }: PianoVoicingPanelProps) {
  const t = useTranslations("app.piano");
  const [voicingIndex, setVoicingIndex] = useState(0);
  const { run: hearVoicing, isPending: isPreparingSound } = useAsyncTrigger(onHearVoicing);

  const voicings = useMemo(() => pianoVoicingsFor(chord), [chord]);
  const voicing = voicings[voicingIndex];
  const rootPitchClass = noteToPitchClass(chord.root);

  function goTo(index: number) {
    setVoicingIndex(((index % voicings.length) + voicings.length) % voicings.length);
  }

  const pitchSummary = voicing.pitches.map((p) => `${noteName(p.note)}${p.octave}`).join(", ");

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {t("title")}
      </h3>

      <div className="mt-2 rounded-xl border border-border bg-surface-raised p-3">
        <PianoKeyboard
          pitches={voicing.pitches}
          rootPitchClass={rootPitchClass}
          paddingSemitones={isDesktop ? 3 : 1}
          ariaLabel={t("keyboardAriaLabel", { notes: pitchSummary })}
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
              {t(voicingLabelKey(voicing))}
              {voicing.catalogue === "pro" && (
                <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                  {t("proBadge")}
                </span>
              )}
            </span>
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

        {voicing.fingering && (
          <p className="mt-2 text-center text-xs text-foreground-muted">
            {t("suggestedFingering")}: {voicing.fingering.fingers.join(" · ")}
          </p>
        )}

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
