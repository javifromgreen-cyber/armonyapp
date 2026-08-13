"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HARMONIC_TERRITORIES, DEPTH_LABEL_KEY } from "@/domain/navigation";
import type { ZoomLevel } from "@/domain/harmony";
import { territoryVisual } from "./territoryVisuals";

const DEPTHS: ZoomLevel[] = [1, 2, 3, 4];

/**
 * Compact, expandable "How to read the map" help (Phase R3.2 §11/§32/§33) —
 * explains the 5 harmonic territories and the 4 depth levels in plain
 * language, using the EXACT same colour/badge identity as the map itself
 * and `ChordContextPanel` (§35: map and legend must share one visual
 * system, never two). Collapsed by default on both desktop and mobile —
 * a single toggle-based disclosure rather than separate desktop/mobile
 * implementations, so there's one behavior to verify and no drift between
 * platforms.
 */
export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const tNav = useTranslations("app.navigation");
  const tTerritory = useTranslations("app.navigation.territory");
  const tTerritoryBlurb = useTranslations("app.navigation.territoryBlurb");
  const tDepth = useTranslations("app.navigation.depth");
  const tDepthBlurb = useTranslations("app.navigation.depthBlurb");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        {tNav("legendToggle")}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-surface-raised p-4 text-left shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{tNav("legendTitle")}</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={tNav("legendClose")}
              className="text-foreground-muted transition-colors hover:text-foreground"
            >
              ×
            </button>
          </div>

          <p className="mt-2 text-xs text-foreground-muted">{tNav("legendTerritoriesIntro")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {HARMONIC_TERRITORIES.map((territory) => {
              const visual = territoryVisual(territory);
              return (
                <li key={territory} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-sm" style={{ color: visual.colorVar }} aria-hidden="true">
                    {visual.badge}
                  </span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: visual.colorVar }}>
                      {tTerritory(territory)}
                    </p>
                    <p className="text-xs text-foreground-muted">{tTerritoryBlurb(territory)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            {tNav("legendDepthTitle")}
          </h4>
          <p className="mt-1 text-xs text-foreground-muted">{tNav("legendDepthIntro")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {DEPTHS.map((depth) => (
              <li key={depth} className="text-xs text-foreground-muted">
                <span className="font-medium text-foreground">
                  {depth} · {tDepth(DEPTH_LABEL_KEY[depth])}
                </span>{" "}
                — {tDepthBlurb(String(depth))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
