import type { HarmonicTerritory } from "@/domain/navigation";

/**
 * One consistent visual identity per harmonic territory (Phase R3.2 §34) —
 * used identically for a territory's map nodes, its edges, and its legend
 * entry (§35: map and legend must share one colour system, never two). A
 * short badge glyph is always paired with the colour so territory
 * recognition never depends on colour alone (§34's colour-blind
 * requirement); the dash pattern gives edges a third, independent cue.
 * Purely presentational — the domain layer has no notion of a "visual
 * identity", only the territory classification itself.
 */
export interface TerritoryVisual {
  /** CSS custom property (defined in globals.css). */
  colorVar: string;
  /** SVG stroke-dasharray for this territory's edges. */
  dashArray: string | undefined;
  /** A short, language-independent glyph — never a Latin-alphabet initial, since the initials differ between English and Spanish. */
  badge: string;
}

const VISUAL_BY_TERRITORY: Record<HarmonicTerritory, TerritoryVisual> = {
  natural: { colorVar: "var(--color-tonic)", dashArray: undefined, badge: "●" },
  tension: { colorVar: "var(--color-dominant)", dashArray: "8 4", badge: "▲" },
  modalColour: { colorVar: "var(--color-borrowed)", dashArray: "2 4", badge: "◐" },
  substitution: { colorVar: "var(--color-predominant)", dashArray: "5 2 1 2", badge: "⇄" },
  exploration: { colorVar: "var(--color-chromatic)", dashArray: "1 6", badge: "✦" },
};

export function territoryVisual(territory: HarmonicTerritory): TerritoryVisual {
  return VISUAL_BY_TERRITORY[territory];
}
