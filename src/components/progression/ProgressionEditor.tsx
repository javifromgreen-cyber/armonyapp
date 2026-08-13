"use client";

import { useTranslations } from "next-intl";
import type { Progression } from "@/domain/progression";
import { ProgressionChordCard } from "./ProgressionChordCard";

export interface ProgressionEditorProps {
  /** Always the confirmed exploration path (Phase R3.3 §22/§33) — never independently edited here. */
  progression: Progression;
  isPlaying: boolean;
  /** The progression item currently sounding — highlights its card (Phase 6 §7). */
  playingItemId: string | null;
  onPlay: () => void;
  onStop: () => void;
}

/**
 * The persistent progression display (product-spec.md §16, revised R3.3,
 * simplified R3.4): a chord-card strip that automatically mirrors the
 * confirmed exploration path, plus a single Play/Stop control — deliberately
 * NOT a DAW timeline and NOT a sequencer (Phase R3.4 §2-9: no BPM, time
 * signature, or per-chord duration UI — Armony is a fast harmonic-route
 * audition tool, not a rhythmic composition tool). Per-item reorder/remove
 * and whole-progression transpose are gone since Phase R3.3 (§32/§38): once
 * the progression IS the confirmed path, editing it independently would
 * silently diverge from the harmonic route the user actually navigated —
 * Back and the top-left harmonic-context control are the (coherent) ways to
 * change it now. Used both as the desktop persistent strip below the map
 * and as the mobile "Progression" tab's content (see ExplorerApp.tsx) —
 * same component, no duplicated logic.
 */
export function ProgressionEditor({
  progression,
  isPlaying,
  playingItemId,
  onPlay,
  onStop,
}: ProgressionEditorProps) {
  const t = useTranslations("app.progression");

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div className="flex flex-1 flex-wrap gap-2 overflow-x-auto">
        {progression.items.map((item) => (
          <ProgressionChordCard
            key={item.id}
            item={item}
            isPlaying={isPlaying && playingItemId === item.id}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={isPlaying ? onStop : onPlay}
        className={[
          "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
          isPlaying
            ? "border-accent bg-accent text-accent-foreground"
            : "border-accent text-accent hover:bg-accent hover:text-accent-foreground",
        ].join(" ")}
      >
        {isPlaying ? t("stopButton") : t("playButton")}
      </button>
    </div>
  );
}
