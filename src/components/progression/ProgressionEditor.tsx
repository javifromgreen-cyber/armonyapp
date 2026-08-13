"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TIME_SIGNATURES, MIN_BPM, MAX_BPM, type Progression, type TimeSignature } from "@/domain/progression";
import { ProgressionChordCard } from "./ProgressionChordCard";

export interface ProgressionEditorProps {
  /** Always the confirmed exploration path (Phase R3.3 §22/§33) — never independently edited here. */
  progression: Progression;
  onSetBpm: (bpm: number) => void;
  onSetTimeSignature: (timeSignature: TimeSignature) => void;
  isPlaying: boolean;
  /** The progression item currently sounding — highlights its card (Phase 6 §7). */
  playingItemId: string | null;
  onPlay: () => void;
  onStop: () => void;
}

/**
 * The persistent progression display (product-spec.md §16, revised Phase
 * R3.3): a chord-card strip that automatically mirrors the confirmed
 * exploration path, plus BPM/time-signature/playback — deliberately NOT a
 * DAW timeline (no tracks, no piano roll, no waveforms). Per-item reorder/
 * remove and whole-progression transpose are gone (Phase R3.3 §32/§38):
 * once the progression IS the confirmed path, editing it independently
 * would silently diverge from the harmonic route the user actually
 * navigated — Back and the top-left harmonic-context control are the
 * (coherent) ways to change it now. Used both as the desktop persistent
 * strip below the map and as the mobile "Progression" tab's content (see
 * ExplorerApp.tsx) — same component, no duplicated logic.
 */
export function ProgressionEditor({
  progression,
  onSetBpm,
  onSetTimeSignature,
  isPlaying,
  playingItemId,
  onPlay,
  onStop,
}: ProgressionEditorProps) {
  const t = useTranslations("app.progression");
  const hasItems = progression.items.length > 0;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {progression.items.map((item) => (
          <ProgressionChordCard
            key={item.id}
            item={item}
            isPlaying={isPlaying && playingItemId === item.id}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3">
        <BpmField key={progression.bpm} bpm={progression.bpm} onCommit={onSetBpm} />

        <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
          {t("timeSignatureLabel")}
          <select
            value={progression.timeSignature}
            onChange={(event) => onSetTimeSignature(event.target.value as TimeSignature)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
          >
            {TIME_SIGNATURES.map((signature) => (
              <option key={signature} value={signature}>
                {signature}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={isPlaying ? onStop : onPlay}
          disabled={!hasItems}
          aria-disabled={!hasItems}
          title={hasItems ? undefined : t("playDisabledHint")}
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            !hasItems
              ? "cursor-not-allowed border-border text-foreground-muted opacity-60"
              : isPlaying
                ? "border-accent bg-accent text-accent-foreground"
                : "border-accent text-accent hover:bg-accent hover:text-accent-foreground",
          ].join(" ")}
        >
          {isPlaying ? t("stopButton") : t("playButton")}
        </button>
      </div>
    </div>
  );
}

/**
 * A locally-buffered BPM input: committing (blur/Enter) rather than every
 * keystroke avoids the domain layer's clamp fighting the user mid-type
 * (e.g. typing "90" would otherwise clamp the intermediate "9" to
 * MIN_BPM=20 and strand the input there before the second digit lands).
 * The parent remounts this component via `key={progression.bpm}` whenever
 * the committed value changes elsewhere, so `draft` re-derives from the
 * fresh `bpm` prop without a synchronizing effect.
 */
function BpmField({ bpm, onCommit }: { bpm: number; onCommit: (bpm: number) => void }) {
  const t = useTranslations("app.progression");
  const [draft, setDraft] = useState(String(bpm));

  function commit() {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setDraft(String(bpm));
    }
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
      {t("bpmLabel")}
      <input
        type="number"
        min={MIN_BPM}
        max={MAX_BPM}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
            event.currentTarget.blur();
          }
        }}
        className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
      />
    </label>
  );
}
