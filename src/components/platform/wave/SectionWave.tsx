import { EDGE_FRAGMENT, fillPath } from "./wavePaths";

/**
 * A large, calm wave fragment bleeding in from one edge of a section
 * (product-spec.md §3 — "very large cropped wave fragments entering from an
 * edge") — reused across Home sections with different `side`/`opacity` so
 * the recurring ONA wave motif varies rather than repeating identically.
 * Fill only, no crest stroke (unlike `HeroWave`) — this is meant to read as
 * ambient depth behind the section's own content, not a second focal point.
 * The parent section must be `relative overflow-hidden` for the bleed to
 * crop correctly.
 */
export function SectionWave({
  side = "right",
  opacity = 0.08,
}: {
  side?: "left" | "right";
  opacity?: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className={`absolute -bottom-1/3 h-[150%] w-[150%] ${
          side === "right" ? "-right-1/4" : "-left-1/4 -scale-x-100"
        }`}
        viewBox={`0 0 ${EDGE_FRAGMENT.width} ${EDGE_FRAGMENT.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <path d={fillPath(EDGE_FRAGMENT)} fill="var(--ona-accent)" opacity={opacity} />
      </svg>
    </div>
  );
}
