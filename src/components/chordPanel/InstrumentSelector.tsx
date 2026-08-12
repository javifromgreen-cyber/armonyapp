"use client";

import { useTranslations } from "next-intl";
import { AVAILABLE_INSTRUMENTS, type Instrument } from "./instrument";

export interface InstrumentSelectorProps {
  value: Instrument;
  onChange: (instrument: Instrument) => void;
}

/**
 * Switches which instrument representation the panel shows (Phase 8 §22).
 * Deliberately never touches chord selection, exploration, the harmonic
 * map/context, or the progression — it only changes which execution view
 * is rendered below.
 */
export function InstrumentSelector({ value, onChange }: InstrumentSelectorProps) {
  const t = useTranslations("app.instrument");

  return (
    <div role="radiogroup" aria-label={t("label")} className="flex gap-1 rounded-full bg-surface p-1">
      {AVAILABLE_INSTRUMENTS.map((instrument) => {
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
