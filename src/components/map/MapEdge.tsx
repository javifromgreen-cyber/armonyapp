export interface MapEdgeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  dashArray: string | undefined;
  colorVar: string;
  /** Short (1-2 char) relationship-family badge (see ./relationshipVisuals) shown at the edge midpoint — a persistent, non-color cue for what kind of relationship this is, without a permanent legend. */
  badge: string;
  /** Full relationship description, shown as a native tooltip on hover/focus. */
  title: string;
  isHighlighted: boolean;
}

/**
 * The connection line from the explored/source chord to one neighbor node.
 * Line treatment (dash pattern) is the primary way relationship families are
 * told apart — never colour alone (product-spec.md §30). The small badge
 * label at the midpoint and the native tooltip (`<title>`) are secondary,
 * always-available reinforcement, since dash patterns alone get hard to
 * distinguish once several relationship families are on screen at once
 * (Zoom 3/4).
 */
export function MapEdge({ from, to, dashArray, colorVar, badge, title, isHighlighted }: MapEdgeProps) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <g>
      <title>{title}</title>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        strokeWidth={isHighlighted ? 3 : 1.25}
        strokeDasharray={dashArray}
        style={{
          stroke: colorVar,
          opacity: isHighlighted ? 1 : 0.35,
          transition: "opacity 200ms ease, stroke-width 200ms ease",
        }}
      />
      <circle
        cx={midX}
        cy={midY}
        r={7.5}
        style={{
          fill: "var(--color-surface)",
          opacity: isHighlighted ? 1 : 0.7,
          transition: "opacity 200ms ease",
        }}
      />
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none font-semibold"
        style={{
          fill: colorVar,
          fontSize: 9,
          opacity: isHighlighted ? 1 : 0.65,
          transition: "opacity 200ms ease",
        }}
      >
        {badge}
      </text>
    </g>
  );
}
