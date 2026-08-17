"use client";

import { useTranslations } from "next-intl";
import { INSTRUMENT_CONFIGS, type StringCount, type TuningExplorerInstrument } from "@/domain/tuningExplorer";

const INSTRUMENTS: TuningExplorerInstrument[] = ["electricGuitar", "acousticGuitar", "bass"];

/** Quick segmented pills (product spec §5) — never a dropdown for instrument/string-count, since these are the two highest-frequency, highest-visibility choices. */
export function InstrumentPills({
  value,
  onChange,
}: {
  value: TuningExplorerInstrument;
  onChange: (instrument: TuningExplorerInstrument) => void;
}) {
  const t = useTranslations("tuningExplorer.instrument");
  return (
    <PillGroup label={t("label")}>
      {INSTRUMENTS.map((instrument) => (
        <Pill key={instrument} isActive={instrument === value} onClick={() => onChange(instrument)}>
          {t(instrument)}
        </Pill>
      ))}
    </PillGroup>
  );
}

export function StringCountPills({
  instrument,
  value,
  onChange,
}: {
  instrument: TuningExplorerInstrument;
  value: StringCount;
  onChange: (stringCount: StringCount) => void;
}) {
  const t = useTranslations("tuningExplorer.strings");
  const counts = INSTRUMENT_CONFIGS[instrument].stringCounts;
  return (
    <PillGroup label={t("label")}>
      {counts.map((count) => (
        <Pill key={count} isActive={count === value} onClick={() => onChange(count)}>
          {count}
        </Pill>
      ))}
    </PillGroup>
  );
}

export function PillGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-foreground-muted uppercase">{label}</span>
      <div role="group" aria-label={label} className="inline-flex rounded-full border border-border p-1">
        {children}
      </div>
    </div>
  );
}

export function Pill({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={[
        "rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
