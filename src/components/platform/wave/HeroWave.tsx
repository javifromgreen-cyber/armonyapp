import { HERO_PRIMARY, HERO_SECONDARY, crestPath, fillPath } from "./wavePaths";

/**
 * The hero's wave backdrop (product-spec.md §8) — a recognizable organic
 * wave silhouette, not a blurred glow. The primary layer pairs a modest
 * translucent fill with a crisp, brighter stroke along just the crest line
 * (the actual curve, not the closing rectangle) — that stroke is what keeps
 * the shape unmistakably readable as a wave at a glance, the way a
 * contour-line illustration reads clearer than a flat silhouette alone. A
 * second, fainter, differently-shaped layer sits behind it for depth. Both
 * drift very slowly and independently (`wave-drift-*` in globals.css,
 * `prefers-reduced-motion`-safe) rather than a repeating tiled scroll.
 *
 * `flip` mirrors the whole composition horizontally — used by the Final CTA
 * to echo the hero's exact wave language without rendering a pixel-identical
 * copy of it.
 */
export function HeroWave({ flip = false }: { flip?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${flip ? "-scale-x-100" : ""}`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${HERO_PRIMARY.width} ${HERO_PRIMARY.height}`}
        preserveAspectRatio="xMidYMax slice"
      >
        <g className="animate-wave-secondary">
          <path d={fillPath(HERO_SECONDARY)} fill="var(--ona-accent)" opacity="0.16" />
        </g>
        <g className="animate-wave-primary">
          <path d={fillPath(HERO_PRIMARY)} fill="var(--ona-accent)" opacity="0.28" />
          <path
            d={crestPath(HERO_PRIMARY)}
            fill="none"
            stroke="var(--ona-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
}
