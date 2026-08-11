"use client";

import { useTranslations } from "next-intl";
import { chordSymbol } from "@/domain/chords";
import { DURATION_CHOICES, type ProgressionItem } from "@/domain/progression";

export interface ProgressionChordCardProps {
  item: ProgressionItem;
  index: number;
  count: number;
  /** True while this exact item is the one currently sounding during progression playback (Phase 6 §7). */
  isPlaying: boolean;
  onRemove: () => void;
  onDurationChange: (durationBeats: number) => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
}

/**
 * A compact chord card — `[ Cmaj7 · 4 ]` from the product spec — with the
 * simplest accessible reorder controls (move-earlier/move-later buttons)
 * rather than drag-and-drop, per the explicit "do not over-engineer
 * drag-and-drop" instruction (product-spec.md §16 / Phase 5 §6).
 */
export function ProgressionChordCard({
  item,
  index,
  count,
  isPlaying,
  onRemove,
  onDurationChange,
  onMoveEarlier,
  onMoveLater,
}: ProgressionChordCardProps) {
  const t = useTranslations("app.progression");
  const symbol = chordSymbol(item.chord);

  return (
    <div
      className={[
        "flex shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors",
        isPlaying ? "border-accent bg-accent/10" : "border-border bg-surface-raised",
      ].join(" ")}
    >
      {isPlaying && <span className="sr-only">{t("nowPlaying", { chord: symbol })}</span>}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMoveEarlier}
          disabled={index === 0}
          aria-label={t("moveEarlier", { chord: symbol })}
          className="text-foreground-muted transition-colors hover:text-foreground disabled:opacity-25 disabled:hover:text-foreground-muted"
        >
          ‹
        </button>
        <span className="min-w-[3ch] text-center text-base font-medium text-foreground">
          {symbol}
        </span>
        <button
          type="button"
          onClick={onMoveLater}
          disabled={index === count - 1}
          aria-label={t("moveLater", { chord: symbol })}
          className="text-foreground-muted transition-colors hover:text-foreground disabled:opacity-25 disabled:hover:text-foreground-muted"
        >
          ›
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={item.durationBeats}
          onChange={(event) => onDurationChange(Number(event.target.value))}
          aria-label={t("durationLabel")}
          className="rounded-md border border-border bg-surface px-1 py-0.5 text-xs text-foreground-muted"
        >
          {DURATION_CHOICES.map((beats) => (
            <option key={beats} value={beats}>
              {beats}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove", { chord: symbol })}
          className="text-foreground-muted transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
