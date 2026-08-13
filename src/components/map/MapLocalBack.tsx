"use client";

import { useTranslations } from "next-intl";
import { chordSymbol } from "@/domain/chords";
import type { NavigationPath } from "@/domain/navigation";

export interface MapLocalBackProps {
  navPath: NavigationPath;
  onBack: () => void;
}

/**
 * A Back control anchored right next to the map itself (Phase R3.1 §10/§36)
 * — the musician who explores the wrong chord shouldn't have to travel to
 * the top toolbar to correct it. Shows the chord Back will return to, so
 * it doubles as the compact "where was I" cue §25 allows in place of a
 * full visible history. Renders nothing at the starting chord, where
 * there's nowhere earlier to go. Silent by default (§11) — the caller's
 * `onBack` only dispatches navigation state, no audio.
 */
export function MapLocalBack({ navPath, onBack }: MapLocalBackProps) {
  const t = useTranslations("app.navigation");
  if (navPath.steps.length <= 1) return null;

  const previousSymbol = chordSymbol(navPath.steps[navPath.steps.length - 2].chord);

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={t("backTo", { chord: previousSymbol })}
      className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-sm font-medium text-foreground-muted shadow-sm backdrop-blur transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">‹</span>
      {previousSymbol}
    </button>
  );
}
