export interface MapEdgeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  dashArray: string | undefined;
  colorVar: string;
  isHighlighted: boolean;
}

/**
 * The connection line from the explored/source chord to one neighbor node.
 * Line treatment (dash pattern) is the primary way relationship families are
 * told apart — never colour alone (product-spec.md §30) — colour is a
 * secondary reinforcement on top of it.
 */
export function MapEdge({ from, to, dashArray, colorVar, isHighlighted }: MapEdgeProps) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      strokeWidth={isHighlighted ? 2 : 1.5}
      strokeDasharray={dashArray}
      style={{
        stroke: colorVar,
        opacity: isHighlighted ? 0.85 : 0.4,
        transition: "opacity 200ms ease, stroke-width 200ms ease",
      }}
    />
  );
}
