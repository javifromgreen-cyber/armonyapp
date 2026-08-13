"use client";

import { useTranslations } from "next-intl";
import { currentMoveDepth, pathDepth, DEPTH_LABEL_KEY, type NavigationPath } from "@/domain/navigation";

export interface DepthIndicatorProps {
  navPath: NavigationPath;
}

/**
 * Replaces the old manual "HARMONIC DEPTH 1 2 3 4" selector (product-spec.md
 * §34) with descriptive-only information: the depth of the move that
 * produced the current endpoint, and the deepest move depth encountered
 * anywhere along the path so far. Both are automatically derived (§5/§7/§8)
 * — the user never sets these, they discover them.
 */
export function DepthIndicator({ navPath }: DepthIndicatorProps) {
  const t = useTranslations("app.navigation");
  const tDepth = useTranslations("app.navigation.depth");

  const moveDepth = currentMoveDepth(navPath);
  const overallDepth = pathDepth(navPath);

  if (moveDepth === undefined && overallDepth === undefined) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {moveDepth !== undefined && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
            {t("currentMove")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {moveDepth} · {tDepth(DEPTH_LABEL_KEY[moveDepth])}
          </p>
        </div>
      )}
      {overallDepth !== undefined && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
            {t("pathDepth")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {overallDepth} · {tDepth(DEPTH_LABEL_KEY[overallDepth])}
          </p>
        </div>
      )}
    </div>
  );
}
