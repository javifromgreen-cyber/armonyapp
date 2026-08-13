import { noteToPitchClass } from "@/domain/notes";
import type { HarmonicTerritory, RankedNavigationOption } from "@/domain/navigation";

export interface PositionedNode {
  option: RankedNavigationOption;
  x: number;
  y: number;
  angleDeg: number;
}

export type LabelAnchor = "start" | "middle" | "end";

export interface TerritorySector {
  territory: HarmonicTerritory;
  count: number;
  startAngleDeg: number;
  endAngleDeg: number;
  /** Heading label position, just outside the candidate ring. */
  labelX: number;
  labelY: number;
  labelAnchor: LabelAnchor;
}

export interface RadialLayout {
  /** SVG viewBox is `0 0 size size`. */
  size: number;
  center: { x: number; y: number };
  radius: number;
  nodes: PositionedNode[];
  /** One entry per POPULATED territory (Phase R3.2 §28/§33 — never shown for an empty one), in canonical order. */
  sectors: TerritorySector[];
}

/** Rendered node radii — shared with HarmonicMap.tsx so the layout's viewBox margin always matches what's actually drawn. */
export const CURRENT_NODE_RADIUS = 60;
export const CANDIDATE_NODE_RADIUS = 34;

const MIN_RING_RADIUS = 170;
const MAX_RING_RADIUS = 320;
/** Minimum gap between two adjacent candidate nodes' edges, so dense option sets never visually touch. */
const NODE_GAP = 12;
/** Extra angular gap inserted between adjacent territory sectors, purely visual separation (never applied between two nodes within the same sector). */
const SECTOR_GAP_DEG = 12;
/** How far outside the candidate ring a territory's heading label sits. */
const LABEL_RING_OFFSET = 26;
/** Rough half-width budget reserved in the viewBox for a heading label's text, so labels near the left/right edge don't clip. */
const LABEL_HALF_WIDTH_BUDGET = 70;
const VIEWBOX_MARGIN = 20;

/**
 * Canonical territory order (Phase R3.2 §3/§20-21) — fixed so the layout
 * never jitters when ranking/context changes which chords are present, and
 * roughly mirrors the product spec's own presentation order (least to most
 * harmonically remote).
 */
const TERRITORY_ORDER: HarmonicTerritory[] = [
  "natural",
  "tension",
  "modalColour",
  "substitution",
  "exploration",
];

/** 3 decimal places — far more precision than the pixel-level rendering needs, while collapsing any cross-platform floating-point last-bit divergence in `Math.cos`/`Math.sin` (avoids a React hydration mismatch). */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toPoint(center: { x: number; y: number }, angleDeg: number, radius: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: round(center.x + radius * Math.cos(angleRad)), y: round(center.y + radius * Math.sin(angleRad)) };
}

/** Anchor a label so it reads naturally on whichever side of the circle it falls: growing right on the right half, growing left on the left half, centered near the vertical poles. */
function labelAnchorFor(angleDeg: number): LabelAnchor {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  if (cos > 0.3) return "start";
  if (cos < -0.3) return "end";
  return "middle";
}

/**
 * The ring radius that gives `n` nodes at the tightest ACTUAL angular gap
 * observed in the layout at least `NODE_GAP` of edge-to-edge breathing
 * room, clamped to [MIN_RING_RADIUS, MAX_RING_RADIUS]. Solved from the
 * chord-length formula for two adjacent points on a circle:
 * distance = 2R·sin(θ/2). Using the tightest REAL gap (rather than
 * assuming uniform 360/n spacing) is what makes this correct once
 * candidates are grouped into unevenly-sized territory sectors with gaps
 * between them (Phase R3.2 §29 — a 10-chord territory packs its nodes
 * tighter than a 2-chord one at the same radius).
 */
function radiusForTightestGap(tightestGapDeg: number): number {
  const minSpacing = 2 * CANDIDATE_NODE_RADIUS + NODE_GAP;
  const required = minSpacing / (2 * Math.sin((tightestGapDeg * Math.PI) / 360));
  return Math.min(MAX_RING_RADIUS, Math.max(MIN_RING_RADIUS, required));
}

/**
 * Groups every immediate outgoing option into its territory's sector
 * (Phase R3.2 §7/§20/§27): every candidate still sits at the SAME radius
 * from the current chord (no depth-ring regression — see R3.1's layout
 * history) and is still a direct sibling destination, but its ANGULAR
 * position now falls within a contiguous, proportionally-sized arc for its
 * territory, separated from neighbouring territories by a small gap and
 * labeled with a heading. Depth stays pure node metadata (a badge),
 * expressed nowhere in this layout's geometry.
 *
 * Territory sector size is data-driven (§29): a territory with more
 * members gets a proportionally larger arc, never forced equal, never
 * truncated. Empty territories are simply absent from `sectors` (§28/§33).
 * Ordering within a sector is by root pitch class then quality id for a
 * stable, non-jittery layout across re-renders (ranking/context changes
 * reorder prominence elsewhere, never node position).
 */
export function computeRadialLayout(options: RankedNavigationOption[]): RadialLayout {
  if (options.length === 0) {
    const half = Math.max(CURRENT_NODE_RADIUS, MIN_RING_RADIUS) + VIEWBOX_MARGIN;
    return { size: half * 2, center: { x: half, y: half }, radius: MIN_RING_RADIUS, nodes: [], sectors: [] };
  }

  const byTerritory = new Map<HarmonicTerritory, RankedNavigationOption[]>();
  for (const option of options) {
    const list = byTerritory.get(option.territory);
    if (list) list.push(option);
    else byTerritory.set(option.territory, [option]);
  }

  const presentTerritories = TERRITORY_ORDER.filter((t) => byTerritory.has(t));
  const gapDeg = presentTerritories.length > 1 ? SECTOR_GAP_DEG : 0;
  const availableDeg = 360 - gapDeg * presentTerritories.length;

  // Pass 1: assign every node an angle (territory-grouped), and record each
  // sector's angular bounds — using a provisional unit radius, since angle
  // assignment doesn't depend on radius at all.
  let cursor = -90; // start at the top, matching prior phases' orientation
  const provisionalNodes: { option: RankedNavigationOption; angleDeg: number }[] = [];
  const sectorBounds: { territory: HarmonicTerritory; count: number; startAngleDeg: number; endAngleDeg: number }[] = [];

  for (const territory of presentTerritories) {
    const members = byTerritory.get(territory)!;
    const span = availableDeg * (members.length / options.length);
    const sorted = [...members].sort((a, b) => {
      const pcA = noteToPitchClass(a.chord.root);
      const pcB = noteToPitchClass(b.chord.root);
      if (pcA !== pcB) return pcA - pcB;
      return a.chord.qualityId.localeCompare(b.chord.qualityId);
    });
    const angleStep = span / sorted.length;
    sorted.forEach((option, index) => {
      provisionalNodes.push({ option, angleDeg: cursor + (index + 0.5) * angleStep });
    });
    sectorBounds.push({ territory, count: sorted.length, startAngleDeg: cursor, endAngleDeg: cursor + span });
    cursor += span + gapDeg;
  }

  // Pass 2: find the tightest actual angular gap between any two
  // consecutive nodes (circularly), then size the radius from that.
  const sortedByAngle = [...provisionalNodes].sort((a, b) => a.angleDeg - b.angleDeg);
  let tightestGapDeg = 360;
  if (sortedByAngle.length > 1) {
    tightestGapDeg = Infinity;
    for (let i = 0; i < sortedByAngle.length; i++) {
      const next = sortedByAngle[(i + 1) % sortedByAngle.length];
      let diff = next.angleDeg - sortedByAngle[i].angleDeg;
      if (diff <= 0) diff += 360;
      tightestGapDeg = Math.min(tightestGapDeg, diff);
    }
  }
  const radius = radiusForTightestGap(tightestGapDeg);

  const labelRadius = radius + CANDIDATE_NODE_RADIUS + LABEL_RING_OFFSET;
  const halfSize =
    Math.max(labelRadius + LABEL_HALF_WIDTH_BUDGET, CURRENT_NODE_RADIUS) + VIEWBOX_MARGIN;
  const size = halfSize * 2;
  const center = { x: halfSize, y: halfSize };

  const nodes: PositionedNode[] = provisionalNodes.map(({ option, angleDeg }) => ({
    option,
    ...toPoint(center, angleDeg, radius),
    angleDeg,
  }));

  const sectors: TerritorySector[] = sectorBounds.map((bounds) => {
    const midAngleDeg = (bounds.startAngleDeg + bounds.endAngleDeg) / 2;
    const labelPoint = toPoint(center, midAngleDeg, labelRadius);
    return {
      territory: bounds.territory,
      count: bounds.count,
      startAngleDeg: bounds.startAngleDeg,
      endAngleDeg: bounds.endAngleDeg,
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      labelAnchor: labelAnchorFor(midAngleDeg),
    };
  });

  return { size, center, radius, nodes, sectors };
}
