"use client";

import { useTranslations } from "next-intl";
import { noteForPitchClass, noteName, type Notation } from "@/domain/notes";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

/**
 * Custom tuning (product spec §8): ONE pitch-CLASS selector per string —
 * never an octave control. Listed low string -> high string (same order
 * `openStringsMidi` is stored in), labeled by conventional string number
 * (string count down to 1, matching real tablature numbering — the
 * highest/thinnest string is always "string 1").
 */
export function CustomTuningEditor({
  openStringsMidi,
  notation,
  onChangeString,
  onReset,
}: {
  openStringsMidi: readonly number[];
  notation: Notation;
  onChangeString: (stringIndex: number, pitchClass: number) => void;
  onReset: () => void;
}) {
  const t = useTranslations("tuningExplorer.custom");
  const stringCount = openStringsMidi.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {openStringsMidi.map((midi, stringIndex) => {
          const stringNumber = stringCount - stringIndex;
          const pitchClass = ((midi % 12) + 12) % 12;
          return (
            <label key={stringIndex} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wide text-foreground-muted uppercase">
                {t("stringLabel", { number: stringNumber })}
              </span>
              <select
                value={pitchClass}
                onChange={(event) => onChangeString(stringIndex, Number(event.target.value))}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {PITCH_CLASSES.map((pc) => (
                  <option key={pc} value={pc}>
                    {noteName(noteForPitchClass(pc, notation))}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-fit rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-foreground-muted hover:text-foreground"
      >
        {t("reset")}
      </button>
    </div>
  );
}
