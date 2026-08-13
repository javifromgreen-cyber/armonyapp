"use client";

import { useTranslations } from "next-intl";
import { chordSymbol } from "@/domain/chords";
import type { NavigationPath } from "@/domain/navigation";

export interface PathBreadcrumbProps {
  navPath: NavigationPath;
  onJumpTo: (index: number) => void;
  onBack: () => void;
  onReset: () => void;
  onHearPath: () => void;
}

/**
 * The chosen exploration path, always visible (product-spec.md §30/Phase R3
 * §13) — where I started, where I've been, where I am now. Earlier steps
 * are clickable (a generalized multi-step Back — jumping straight to an
 * earlier point in the path); the current endpoint is styled distinctly and
 * isn't a separate click target here (clicking the map's own center node
 * already handles that). Replaces the old manual Zoom 1-4 selector's screen
 * real estate (§34) together with `DepthIndicator`.
 */
export function PathBreadcrumb({ navPath, onJumpTo, onBack, onReset, onHearPath }: PathBreadcrumbProps) {
  const t = useTranslations("app.navigation");
  const canGoBack = navPath.steps.length > 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        {t("back")}
      </button>

      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-x-auto" aria-label={t("pathLabel")}>
        {navPath.steps.map((step, index) => {
          const isLast = index === navPath.steps.length - 1;
          const symbol = chordSymbol(step.chord);
          return (
            <li key={`${symbol}-${index}`} className="flex shrink-0 items-center gap-1">
              {index > 0 && <span className="text-foreground-muted/50">→</span>}
              {isLast ? (
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  {symbol}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onJumpTo(index)}
                  aria-label={t("jumpToStep", { chord: symbol })}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {symbol}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onHearPath}
        disabled={!canGoBack}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        {t("hearPath")}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        {t("reset")}
      </button>
    </div>
  );
}
