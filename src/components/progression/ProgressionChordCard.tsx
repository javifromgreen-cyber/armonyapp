"use client";

import { useTranslations } from "next-intl";
import { chordSymbol } from "@/domain/chords";
import type { ProgressionItem } from "@/domain/progression";

export interface ProgressionChordCardProps {
  item: ProgressionItem;
  /** True while this exact item is the one currently sounding during progression playback (Phase 6 §7). */
  isPlaying: boolean;
}

/**
 * A compact chord card — `[ Cmaj7 · 4 ]` from the product spec — purely
 * DISPLAY since Phase R3.3 §22/§33/§38: the progression is now the
 * confirmed exploration path itself, so per-item reorder/remove controls
 * are gone (they had no coherent meaning once an item's position/presence
 * is derived from navigation history rather than independently editable —
 * see `docs/architecture.md`'s R3.3 deviation entry). Navigate/Back on the
 * map is how the route — and therefore this strip — changes.
 */
export function ProgressionChordCard({ item, isPlaying }: ProgressionChordCardProps) {
  const t = useTranslations("app.progression");
  const symbol = chordSymbol(item.chord);

  return (
    <div
      className={[
        "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-colors",
        isPlaying ? "border-accent bg-accent/10" : "border-border bg-surface-raised",
      ].join(" ")}
    >
      {isPlaying && <span className="sr-only">{t("nowPlaying", { chord: symbol })}</span>}
      <span className="text-base font-medium text-foreground">{symbol}</span>
      <span className="text-xs text-foreground-muted">
        {t("beats", { count: item.durationBeats })}
      </span>
    </div>
  );
}
