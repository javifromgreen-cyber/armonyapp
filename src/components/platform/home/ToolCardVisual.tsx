interface CardMapNode {
  label: string;
  x: number;
  y: number;
  radius: number;
  /** Territory colour + dash language, copied from `src/components/map/territoryVisuals.ts` — literal CSS var strings only, no `@/domain` import, so this stays a static illustration rather than a second consumer of the harmony engine. */
  colorVar: string;
  dashArray: string | undefined;
  /** Shown only for a few nodes, small and subtle — territory colour/spacing carries most of the meaning (product-spec.md §11 requirement #11). */
  territoryLabel?: string;
}

const CENTER = { x: 138, y: 118, label: "C" };
const CENTER_RADIUS = 21;

// A real, verified excerpt of C major's neighborhood from the current chord
// C (confirmed against `harmonicTerritoryFor`/`relationshipsFrom` — not
// hand-guessed): one genuine outgoing chord per territory, so the card
// demonstrates the actual "different harmonic directions" idea rather than
// "one chord connected to several chords." Distances from the center loosely
// track real harmonic depth — the exploration/modal-colour nodes sit
// farther out than the natural/tension ones, echoing (not literally
// reproducing) how deeper relationships read on the real map.
const NODES: CardMapNode[] = [
  {
    label: "F",
    x: 62,
    y: 66,
    radius: 15,
    colorVar: "var(--color-tonic)",
    dashArray: undefined,
    territoryLabel: "Natural",
  },
  {
    label: "A7",
    x: 224,
    y: 52,
    radius: 14,
    colorVar: "var(--color-dominant)",
    dashArray: "7 3",
    territoryLabel: "Tension",
  },
  {
    label: "Em",
    x: 214,
    y: 128,
    radius: 13,
    colorVar: "var(--color-predominant)",
    dashArray: "5 2 1 2",
  },
  {
    label: "Ab",
    x: 66,
    y: 178,
    radius: 14,
    colorVar: "var(--color-borrowed)",
    dashArray: "2 4",
  },
  {
    label: "A",
    x: 268,
    y: 182,
    radius: 13,
    colorVar: "var(--color-chromatic)",
    dashArray: "1 6",
    territoryLabel: "Exploration",
  },
];

/**
 * A small, static excerpt of a real Armony harmonic-map state, chosen to
 * demonstrate harmonic TERRITORIES (product-spec.md §8/§30) rather than just
 * "a chord connected to other chords": each surrounding node is a genuine
 * outgoing relationship from C in C major, and each belongs to a different
 * real territory — natural (F), tension (A7), substitution (Em), modal
 * colour (Ab), exploration (A) — reusing the SAME CSS custom properties and
 * dash-pattern language as `MapNode.tsx`/`MapEdge.tsx`/`territoryVisuals.ts`
 * so the colours stay in sync with Armony automatically. Deliberately NOT a
 * reuse of the live `HarmonicMap` component (no layout engine, no
 * interaction state, no `@/domain` import) — just enough of the real visual
 * language, with real chord labels, to be recognizable at a glance.
 */
export function ToolCardVisual() {
  return (
    <div className="flex h-44 items-center justify-center bg-ona-bg">
      <svg width="240" height="152" viewBox="0 0 320 216" aria-hidden="true">
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
              r={node.radius}
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
            {node.territoryLabel && (
              <text
                x={node.x}
                y={node.y + node.radius + 13}
                textAnchor="middle"
                fontSize={8}
                fontWeight={600}
                letterSpacing="0.04em"
                fill={node.colorVar}
                opacity={0.75}
              >
                {node.territoryLabel.toUpperCase()}
              </text>
            )}
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
