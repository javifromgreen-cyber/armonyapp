"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  TIME_SIGNATURES,
  MIN_BPM,
  MAX_BPM,
  type Progression,
  type TimeSignature,
} from "@/domain/progression";
import { ProgressionChordCard } from "./ProgressionChordCard";

export interface ProgressionEditorProps {
  progression: Progression;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSetDuration: (id: string, durationBeats: number) => void;
  onSetBpm: (bpm: number) => void;
  onSetTimeSignature: (timeSignature: TimeSignature) => void;
  onClear: () => void;
  onTranspose: (semitones: number) => void;
}

/**
 * The persistent composition workspace (product-spec.md §16): a lightweight
 * chord-card strip plus BPM/time-signature/transpose controls — deliberately
 * NOT a DAW timeline (no tracks, no piano roll, no waveforms). Used both as
 * the desktop persistent strip below the map and as the mobile "Progression"
 * tab's content (see ExplorerApp.tsx) — same component, no duplicated logic.
 */
export function ProgressionEditor({
  progression,
  onRemove,
  onReorder,
  onSetDuration,
  onSetBpm,
  onSetTimeSignature,
  onClear,
  onTranspose,
}: ProgressionEditorProps) {
  const t = useTranslations("app.progression");
  const hasItems = progression.items.length > 0;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {hasItems ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {progression.items.map((item, index) => (
            <ProgressionChordCard
              key={item.id}
              item={item}
              index={index}
              count={progression.items.length}
              onRemove={() => onRemove(item.id)}
              onDurationChange={(durationBeats) => onSetDuration(item.id, durationBeats)}
              onMoveEarlier={() => onReorder(index, index - 1)}
              onMoveLater={() => onReorder(index, index + 1)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">{t("empty")}</p>
      )}

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

        <div className="flex items-center gap-1">
          <span className="text-xs text-foreground-muted">{t("transposeLabel")}</span>
          <button
            type="button"
            onClick={() => onTranspose(-1)}
            disabled={!hasItems}
            aria-label={t("transposeDown")}
            className="rounded-md border border-border px-2 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onTranspose(1)}
            disabled={!hasItems}
            aria-label={t("transposeUp")}
            className="rounded-md border border-border px-2 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title={t("playDisabledHint")}
          className="cursor-not-allowed rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted opacity-60"
        >
          {t("playButton")}
        </button>

        {hasItems && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-xs text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("clear")}
          </button>
        )}
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
