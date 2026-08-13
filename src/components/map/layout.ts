import { noteToPitchClass } from "@/domain/notes";
import type { ZoomLevel } from "@/domain/harmony";
import type { RankedNavigationOption } from "@/domain/navigation";

export interface PositionedNode {
  option: RankedNavigationOption;
  x: number;
  y: number;
  angleDeg: number;
  radius: number;
}

export interface RadialLayout {
  /** SVG viewBox is `0 0 size size`. */
  size: number;
  center: { x: number; y: number };
  nodes: PositionedNode[];
}

/** Rendered node radii — shared with HarmonicMap.tsx so the layout's viewBox margin always matches what's actually drawn. */
export const SOURCE_NODE_RADIUS = 54;
export const NEIGHBOR_NODE_RADIUS = 30;

/** Ring radius per move depth — a deeper (more distant/colourful) move sits further out, visually reinforcing depth as distance (Phase R3 §16). */
const RING_RADIUS: Record<ZoomLevel, number> = { 1: 150, 2: 235, 3: 315, 4: 390 };

const VIEWBOX_MARGIN = 28;

/** 3 decimal places — far more precision than the pixel-level rendering needs, while collapsing any cross-platform floating-point last-bit divergence in `Math.cos`/`Math.sin`. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Deterministic radial layout: the current path endpoint is implicitly at
 * the center (callers render it separately); every outgoing option is
 * placed on the ring for ITS OWN move's depth — `option.depth`, i.e. the
 * depth of `option.primaryRelationship`, the same relationship whose
 * explanation/character the UI displays for that option (Phase R3 §6:
 * "depth belongs to the move"). This is a deliberate R3 revision of the
 * Phase 4 layout, which keyed rings by a chord's SHALLOWEST depth across
 * all its relationships (`introducedAtDepth`) — that could show a node on
 * an inner ring while its displayed (strongest) relationship badge/
 * explanation described a deeper move, which read as inconsistent once
 * every depth is always visible at once (no more manual Zoom selector to
 * hide the mismatch). See docs/architecture.md's R3 deviation note.
 *
 * Since Phase R3 removes the manual Zoom selector, ALL depths 1-4 are
 * always present together — ordering within a ring is by root pitch class
 * then quality id for a stable, non-jittery layout across re-renders
 * (ranking changes prominence via visual treatment elsewhere, not position
 * — position only encodes depth, per §9's "combination of number/edge
 * treatment/badge" guidance rather than relying on order alone).
 *
 * The viewBox is sized to whatever depths are actually populated (never a
 * fixed worst-case box), so a chord with only Zoom 1-2 options still fills
 * its available space instead of sitting small inside an oversized box.
 */
export function computeRadialLayout(options: RankedNavigationOption[]): RadialLayout {
  const byDepth = new Map<ZoomLevel, RankedNavigationOption[]>();
  for (const option of options) {
    const ring = byDepth.get(option.depth);
    if (ring) {
      ring.push(option);
    } else {
      byDepth.set(option.depth, [option]);
    }
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const maxRadiusUsed = depths.reduce((max, depth) => Math.max(max, RING_RADIUS[depth]), 0);

  const halfSize =
    Math.max(maxRadiusUsed + NEIGHBOR_NODE_RADIUS, SOURCE_NODE_RADIUS) + VIEWBOX_MARGIN;
  const size = halfSize * 2;
  const center = { x: halfSize, y: halfSize };

  const positioned: PositionedNode[] = [];

  for (const depth of depths) {
    const ring = byDepth.get(depth)!;
    const sorted = [...ring].sort((a, b) => {
      const pcA = noteToPitchClass(a.chord.root);
      const pcB = noteToPitchClass(b.chord.root);
      if (pcA !== pcB) return pcA - pcB;
      return a.chord.qualityId.localeCompare(b.chord.qualityId);
    });

    const radius = RING_RADIUS[depth];
    const angleStep = 360 / sorted.length;

    sorted.forEach((option, index) => {
      const angleDeg = -90 + index * angleStep;
      const angleRad = (angleDeg * Math.PI) / 180;
      positioned.push({
        option,
        // Rounded to avoid a React hydration mismatch: Math.cos/Math.sin can
        // differ in their very last bit between the server (Node) and
        // client (browser) V8 builds for the same input, which otherwise
        // renders two different (though visually identical) SVG coordinate
        // strings for the same node.
        x: round(center.x + radius * Math.cos(angleRad)),
        y: round(center.y + radius * Math.sin(angleRad)),
        angleDeg,
        radius,
      });
    });
  }

  return { size, center, nodes: positioned };
}
