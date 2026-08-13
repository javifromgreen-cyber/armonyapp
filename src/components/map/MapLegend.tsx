"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HARMONIC_TERRITORIES, DEPTH_LABEL_KEY } from "@/domain/navigation";
import type { ZoomLevel } from "@/domain/harmony";
import { territoryVisual } from "./territoryVisuals";

const DEPTHS: ZoomLevel[] = [1, 2, 3, 4];

/**
 * Compact, expandable "How to read the map" help (Phase R3.2 §11/§32/§33,
 * layout fixed in R3.3 §2-4/§52) — explains the 5 harmonic territories and
 * the 4 depth levels in plain language, using the EXACT same colour/badge
 * identity as the map itself and `ChordContextPanel` (§35: map and legend
 * must share one visual system, never two). Collapsed by default on both
 * desktop and mobile — a single toggle-based disclosure rather than
 * separate desktop/mobile implementations, so there's one behavior to
 * verify and no drift between platforms.
 *
 * Rendered as a `position: fixed`, viewport-centered overlay rather than an
 * `absolute`-positioned popover anchored to the toggle button (R3.3 fix —
 * the previous version was clipped by an ancestor's `overflow-hidden`
 * boundary, which sits roughly where the bottom Progression strip begins,
 * making Depth 3/4 unreachable on common viewport heights). `position:
 * fixed` escapes that ancestor's clipping entirely (its containing block is
 * the viewport, not the clipped flex column), and `max-h-[85vh]` +
 * `overflow-y-auto` guarantee every item stays reachable by scrolling
 * regardless of viewport height, rather than relying on a fixed pixel
 * height that could still overflow on a short window.
 */
export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const tNav = useTranslations("app.navigation");
  const tTerritory = useTranslations("app.navigation.territory");
  const tTerritoryBlurb = useTranslations("app.navigation.territoryBlurb");
  const tDepth = useTranslations("app.navigation.depth");
  const tDepthBlurb = useTranslations("app.navigation.depthBlurb");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        {tNav("legendToggle")}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tNav("legendTitle")}
            className="relative z-10 flex max-h-[85vh] w-[min(26rem,100%)] flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
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

            <div className="overflow-y-auto p-4">
              <p className="text-xs text-foreground-muted">{tNav("legendTerritoriesIntro")}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {HARMONIC_TERRITORIES.map((territory) => {
                  const visual = territoryVisual(territory);
                  return (
                    <li key={territory} className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0 text-sm"
                        style={{ color: visual.colorVar }}
                        aria-hidden="true"
                      >
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
          </div>
        </div>
      )}
    </>
  );
}
