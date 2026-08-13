import { noteToPitchClass } from "@/domain/notes";
import type { RankedNavigationOption } from "@/domain/navigation";

export interface PositionedNode {
  option: RankedNavigationOption;
  x: number;
  y: number;
  angleDeg: number;
}

export interface RadialLayout {
  /** SVG viewBox is `0 0 size size`. */
  size: number;
  center: { x: number; y: number };
  radius: number;
  nodes: PositionedNode[];
}

/** Rendered node radii — shared with HarmonicMap.tsx so the layout's viewBox margin always matches what's actually drawn. Bumped up from Phase R3 for readability (Phase R3.1 §22) and a stronger current-chord size hierarchy (§15). */
export const CURRENT_NODE_RADIUS = 60;
export const CANDIDATE_NODE_RADIUS = 36;

const MIN_RING_RADIUS = 160;
const MAX_RING_RADIUS = 300;
/** Minimum gap between two adjacent candidate nodes' edges, so dense option sets never visually touch. */
const NODE_GAP = 12;
const VIEWBOX_MARGIN = 30;

/**
 * The ring radius that gives `count` evenly-spaced nodes at least
 * `NODE_GAP` of breathing room between their edges, clamped to
 * [MIN_RING_RADIUS, MAX_RING_RADIUS]. Solved from the chord-length
 * formula for two adjacent points on a circle: distance = 2R·sin(π/n).
 */
function adaptiveRadius(count: number): number {
  if (count <= 1) return MIN_RING_RADIUS;
  const minSpacing = 2 * CANDIDATE_NODE_RADIUS + NODE_GAP;
  const required = minSpacing / (2 * Math.sin(Math.PI / count));
  return Math.min(MAX_RING_RADIUS, Math.max(MIN_RING_RADIUS, required));
}

/** 3 decimal places — far more precision than the pixel-level rendering needs, while collapsing any cross-platform floating-point last-bit divergence in `Math.cos`/`Math.sin` (avoids a React hydration mismatch). */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Every immediate outgoing option sits on ONE shared ring around the
 * current chord, at a radius that adapts to how many options there are
 * (Phase R3.1 §16-23). This deliberately replaces Phase R3's depth-keyed
 * concentric rings: placing deeper-depth options on a visually more
 * distant ring made them read as descendants of the inner-ring options
 * ("F#dim -> C -> Cmaj7 -> Dm..." looked like a chain) rather than as
 * equally-direct siblings of the current chord — exactly the false
 * parentage Phase R3.1 corrects. Depth stays real, visible metadata (a
 * badge on each node, per `MapNode`) — it's just never expressed as radial
 * distance anymore. Ordering within the ring is by root pitch class then
 * quality id for a stable, non-jittery layout across re-renders (rank/
 * context can change which option a screen reader announces first without
 * the whole ring visually reshuffling).
 */
export function computeRadialLayout(options: RankedNavigationOption[]): RadialLayout {
  const radius = adaptiveRadius(options.length);
  const halfSize = Math.max(radius + CANDIDATE_NODE_RADIUS, CURRENT_NODE_RADIUS) + VIEWBOX_MARGIN;
  const size = halfSize * 2;
  const center = { x: halfSize, y: halfSize };

  const sorted = [...options].sort((a, b) => {
    const pcA = noteToPitchClass(a.chord.root);
    const pcB = noteToPitchClass(b.chord.root);
    if (pcA !== pcB) return pcA - pcB;
    return a.chord.qualityId.localeCompare(b.chord.qualityId);
  });

  const angleStep = 360 / sorted.length;
  const nodes: PositionedNode[] = sorted.map((option, index) => {
    const angleDeg = -90 + index * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      option,
      x: round(center.x + radius * Math.cos(angleRad)),
      y: round(center.y + radius * Math.sin(angleRad)),
      angleDeg,
    };
  });

  return { size, center, radius, nodes };
}
