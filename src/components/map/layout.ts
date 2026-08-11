import { noteToPitchClass } from "@/domain/notes";
import type { ZoomLevel } from "@/domain/harmony";
import type { MapGraphNode } from "@/domain/graph";

export interface PositionedNode {
  node: MapGraphNode;
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
export const NEIGHBOR_NODE_RADIUS = 34;

/** Ring radius per Zoom depth — deeper harmonic depth sits further out, visually reinforcing that Zoom IS depth, not just node count. */
const RING_RADIUS: Record<ZoomLevel, number> = { 1: 140, 2: 215, 3: 285, 4: 350 };

const VIEWBOX_MARGIN = 24;

/**
 * Deterministic radial layout: the source chord is implicitly at the center
 * (callers render it separately); every other chord is placed on the ring
 * for the Zoom depth it was first introduced at, evenly spaced by angle.
 * Ordering within a ring is by root pitch class then quality id, so the same
 * query always produces the same layout regardless of edge-generation order
 * — required for the map to feel stable rather than jittery when relationships
 * are recomputed (e.g. after a Zoom change that doesn't affect this ring).
 *
 * The viewBox is sized to whatever is actually populated (not a fixed
 * worst-case box for Zoom 4) — at Zoom 1 that's just the inner ring, so the
 * map fills its available screen space instead of sitting small in the
 * middle of a mostly-empty box reserved for rings that aren't shown yet.
 */
export function computeRadialLayout(nodes: MapGraphNode[]): RadialLayout {
  const byDepth = new Map<ZoomLevel, MapGraphNode[]>();
  for (const node of nodes) {
    const ring = byDepth.get(node.introducedAtDepth);
    if (ring) {
      ring.push(node);
    } else {
      byDepth.set(node.introducedAtDepth, [node]);
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

    sorted.forEach((node, index) => {
      const angleDeg = -90 + index * angleStep;
      const angleRad = (angleDeg * Math.PI) / 180;
      positioned.push({
        node,
        x: center.x + radius * Math.cos(angleRad),
        y: center.y + radius * Math.sin(angleRad),
        angleDeg,
        radius,
      });
    });
  }

  return { size, center, nodes: positioned };
}
