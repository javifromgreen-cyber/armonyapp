"use client";

import { useTranslations } from "next-intl";
import { INSTRUMENT_NAMES, type InstrumentName } from "@/domain/instruments";

export interface InstrumentSelectorProps {
  value: InstrumentName;
  onChange: (instrument: InstrumentName) => void;
}

/**
 * The ONE global instrument selector (Phase R3.3 §5-8) — controls both the
 * map/path audition instrument and the right panel's execution
 * representation (Piano keyboard / Guitar shape+TAB / Bass pattern+TAB).
 * Deliberately never touches chord selection, exploration, the harmonic
 * map/context, or the progression — changing it only changes which sound
 * and which execution view are used, never harmonic state (§8).
 */
export function InstrumentSelector({ value, onChange }: InstrumentSelectorProps) {
  const t = useTranslations("app.instrument");

  return (
    <div role="radiogroup" aria-label={t("label")} className="flex gap-1 rounded-full bg-surface p-1">
      {INSTRUMENT_NAMES.map((instrument) => {
        const isActive = instrument === value;
        return (
          <button
            key={instrument}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(instrument)}
            className={[
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              isActive ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:text-foreground",
            ].join(" ")}
          >
            {t(instrument)}
          </button>
        );
      })}
    </div>
  );
}
