import type { RelationshipType } from "@/domain/harmony";

/**
 * A coarse visual family for each of the 15 relationship types, so the map
 * can differentiate relationships without relying on colour alone (line
 * treatment + a short badge letter carry the meaning; colour reinforces it).
 * Purely presentational — the domain layer has no notion of "category".
 */
export type RelationshipCategory = "core" | "dominant" | "borrowed" | "chromatic" | "deep";

const CATEGORY_BY_TYPE: Record<RelationshipType, RelationshipCategory> = {
  diatonic: "core",
  relative: "core",
  functionalDominant: "core",
  leadingToneDiminished: "core",
  diatonicSeventh: "core",
  substitution: "core",
  secondaryDominant: "dominant",
  secondaryDominantChain: "dominant",
  tritoneSubstitution: "dominant",
  borrowed: "borrowed",
  passingDiminished: "chromatic",
  chromaticMediant: "chromatic",
  nearbyKey: "chromatic",
  commonTone: "deep",
  distantKey: "deep",
};

export interface RelationshipVisual {
  category: RelationshipCategory;
  /** SVG stroke-dasharray — the primary, non-colour differentiator. */
  dashArray: string | undefined;
  /** CSS custom property (defined in globals.css) carrying this category's accent colour. */
  colorVar: string;
  /** Short (1-2 char) badge shown on the edge/node — a second, text-based differentiator. */
  badge: string;
}

const VISUAL_BY_CATEGORY: Record<RelationshipCategory, Omit<RelationshipVisual, "category">> = {
  core: { dashArray: undefined, colorVar: "var(--color-accent)", badge: "◆" },
  dominant: { dashArray: "8 4", colorVar: "var(--color-dominant)", badge: "V" },
  borrowed: { dashArray: "2 4", colorVar: "var(--color-borrowed)", badge: "B" },
  chromatic: { dashArray: "1 5", colorVar: "var(--color-chromatic)", badge: "◇" },
  deep: { dashArray: "1 8", colorVar: "var(--color-foreground-muted)", badge: "·" },
};

export function relationshipVisual(type: RelationshipType): RelationshipVisual {
  const category = CATEGORY_BY_TYPE[type];
  return { category, ...VISUAL_BY_CATEGORY[category] };
}
