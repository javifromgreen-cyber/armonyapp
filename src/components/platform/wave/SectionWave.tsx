import type { WaveCurve } from "./wavePaths";
import { crestPath, fillPath } from "./wavePaths";

/**
 * A large, calm wave fragment bleeding in from one edge of a section
 * (product-spec.md §3 — "very large cropped wave fragments entering from an
 * edge") — same design language as `HeroWave` (a translucent fill plus a
 * crisp, fainter crest stroke, not fill alone), just at lower intensity so
 * it reads as ambient depth behind the section's own content rather than a
 * second focal point. Each call site passes its OWN `curve` (see
 * `wavePaths.ts`'s `INTRO_WAVE`/`TRIAL_WAVE`) — never the same shape mirrored
 * — so sections that both use this component still look visually distinct.
 * Drifts very slowly via the same `animate-wave-secondary` keyframe the
 * hero's back layer uses, so the motion feels like one continuous system
 * rather than a second animation language. The parent section must be
 * `relative overflow-hidden` for the bleed to crop correctly.
 */
export function SectionWave({
  curve,
  side = "right",
  opacity = 0.14,
}: {
  curve: WaveCurve;
  side?: "left" | "right";
  opacity?: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className={`absolute -bottom-1/4 h-[135%] w-[135%] animate-wave-secondary ${
          side === "right" ? "-right-1/5" : "-left-1/5 -scale-x-100"
        }`}
        viewBox={`0 0 ${curve.width} ${curve.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <path d={fillPath(curve)} fill="var(--ona-accent)" opacity={opacity} />
        <path
          d={crestPath(curve)}
          fill="none"
          stroke="var(--ona-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={Math.min(opacity * 3, 0.5)}
        />
      </svg>
    </div>
  );
}
