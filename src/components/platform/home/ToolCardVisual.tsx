interface CardMapNode {
  label: string;
  x: number;
  y: number;
  /** Territory colour + dash language, copied from `src/components/map/territoryVisuals.ts` — literal CSS var strings only, no `@/domain` import, so this stays a static illustration rather than a second consumer of the harmony engine. */
  colorVar: string;
  dashArray: string | undefined;
}

const CENTER = { x: 160, y: 108, label: "C" };
const NODE_RADIUS = 16;
const CENTER_RADIUS = 21;

// A real, valid excerpt of C major's diatonic neighborhood (product-spec.md
// §11) — the same chords and the same territory colours/dash patterns
// Armony's actual map would show for these relationships, just a small,
// static subset rather than the full outgoing set.
const NODES: CardMapNode[] = [
  { label: "Dm", x: 62, y: 56, colorVar: "var(--color-tonic)", dashArray: undefined },
  { label: "Em", x: 118, y: 24, colorVar: "var(--color-tonic)", dashArray: undefined },
  { label: "F", x: 205, y: 22, colorVar: "var(--color-tonic)", dashArray: undefined },
  { label: "Am", x: 255, y: 68, colorVar: "var(--color-tonic)", dashArray: undefined },
  { label: "G7", x: 245, y: 152, colorVar: "var(--color-dominant)", dashArray: "6 3" },
];

/**
 * A small, static excerpt of a real Armony harmonic-map state — reusing the
 * SAME node/edge styling formulas as `MapNode.tsx`/`MapEdge.tsx` (filled
 * accent center vs. outlined territory-coloured candidates, the same
 * dash-pattern-per-territory language) and the SAME CSS custom properties,
 * so the colours stay in sync with Armony automatically. Deliberately NOT a
 * reuse of the live `HarmonicMap` component (no layout engine, no
 * interaction state, no `@/domain` import) — just enough of the real visual
 * language, with real chord labels, to be recognizable at a glance.
 */
export function ToolCardVisual() {
  return (
    <div className="flex h-40 items-center justify-center bg-ona-bg">
      <svg width="220" height="140" viewBox="0 0 320 216" aria-hidden="true">
        {NODES.map((node) => (
          <line
            key={`edge-${node.label}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={node.x}
            y2={node.y}
            stroke={node.colorVar}
            strokeWidth={1.5}
            strokeDasharray={node.dashArray}
            opacity={0.75}
          />
        ))}

        {NODES.map((node) => (
          <g key={`node-${node.label}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill="var(--color-surface-raised)"
              stroke={node.colorVar}
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={500}
              fill="var(--color-foreground)"
            >
              {node.label}
            </text>
          </g>
        ))}

        <circle cx={CENTER.x} cy={CENTER.y} r={CENTER_RADIUS} fill="var(--color-accent)" />
        <text
          x={CENTER.x}
          y={CENTER.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={700}
          fill="var(--color-accent-foreground)"
        >
          {CENTER.label}
        </text>
      </svg>
    </div>
  );
}
