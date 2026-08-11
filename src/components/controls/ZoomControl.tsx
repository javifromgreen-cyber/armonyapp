"use client";

import { useTranslations } from "next-intl";
import type { ZoomLevel } from "@/domain/harmony";

const ZOOM_LEVELS: ZoomLevel[] = [1, 2, 3, 4];

export interface ZoomControlProps {
  zoom: ZoomLevel;
  /**
   * Depths above this are shown but disabled — the entitlement system
   * (Phase 11) will pass Free's cap (2) here; Phase 4 defaults to 4 (all
   * depths open) so every level is usable during development.
   */
  maxAllowedZoom?: ZoomLevel;
  onChange: (zoom: ZoomLevel) => void;
}

export function ZoomControl({ zoom, maxAllowedZoom = 4, onChange }: ZoomControlProps) {
  const t = useTranslations("app.zoom");

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {t("label")}
      </legend>
      <div role="radiogroup" aria-label={t("label")} className="flex gap-1 rounded-full bg-surface p-1">
        {ZOOM_LEVELS.map((level) => {
          const isActive = level === zoom;
          const isAllowed = level <= maxAllowedZoom;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={!isAllowed}
              title={t(`description${level}`)}
              onClick={() => onChange(level)}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : isAllowed
                    ? "text-foreground-muted hover:text-foreground"
                    : "cursor-not-allowed text-foreground-muted/40",
              ].join(" ")}
            >
              {level}
              <span className="sr-only"> — {t(`description${level}`)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
