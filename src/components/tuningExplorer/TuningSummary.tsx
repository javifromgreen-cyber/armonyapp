"use client";

import { useTranslations } from "next-intl";
import { noteForPitchClass, noteName, type Notation } from "@/domain/notes";
import { maxFretFor, type StringCount, type TuningExplorerInstrument } from "@/domain/tuningExplorer";

/**
 * Immediately above the fretboard (product spec §20): the preset name (or
 * nothing, while Custom is active — there's no canonical name for an
 * arbitrary custom tuning), the open strings LOW -> HIGH (the conventional
 * way tunings are written — deliberately the OPPOSITE order the fretboard
 * itself renders in, see `Fretboard.tsx`), the instrument/string/fret
 * summary line, and the "Play open strings" trigger.
 */
export function TuningSummary({
  presetName,
  instrument,
  stringCount,
  openStringsMidi,
  notation,
  onPlayOpenStrings,
  isPlaying,
}: {
  presetName: string | null;
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  openStringsMidi: readonly number[];
  notation: Notation;
  onPlayOpenStrings: () => void;
  isPlaying: boolean;
}) {
  const t = useTranslations("tuningExplorer");
  const tInstrument = useTranslations("tuningExplorer.instrument");
  const maxFret = maxFretFor(instrument);

  const openNoteNames = openStringsMidi.map((midi) => {
    const pitchClass = ((midi % 12) + 12) % 12;
    return noteName(noteForPitchClass(pitchClass, notation));
  });

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 sm:px-6">
      <h1 className="text-lg font-semibold text-foreground">
        {presetName ?? t("customTuningTitle")}
      </h1>
      <p className="text-sm text-foreground-muted" aria-label={t("openStringsAriaLabel")}>
        {openNoteNames.join(" · ")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-foreground-muted">
          {tInstrument(instrument)} · {t("stringsCount", { count: stringCount })} · {t("fretsCount", { count: maxFret })}
        </p>
        <button
          type="button"
          onClick={onPlayOpenStrings}
          disabled={isPlaying}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">▶</span> {t("playOpenStrings")}
        </button>
      </div>
    </div>
  );
}
