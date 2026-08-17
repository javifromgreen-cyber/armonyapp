/**
 * A small, static stylized fretboard excerpt for the ONA catalogue card
 * (product spec §2) — deliberately NOT a reuse of the live `Fretboard`
 * component (no domain import, no interaction state, no real tuning data)
 * — just enough of the same visual language (dark wood surface, metallic
 * strings of varying thickness, note capsules, fret dots) to be
 * recognizable at a glance, matching how `ToolCardVisual.tsx` treats
 * Armony's own map preview.
 */
export function TuningExplorerCardVisual() {
  const strings = [
    { y: 30, thickness: 1.5 },
    { y: 55, thickness: 2 },
    { y: 80, thickness: 2.5 },
    { y: 105, thickness: 3.2 },
  ];
  const frets = [70, 130, 190, 250];
  const notes = ["E", "A", "D", "G"];

  return (
    <div className="flex h-44 items-center justify-center bg-ona-bg">
      <svg width="240" height="140" viewBox="0 0 320 140" aria-hidden="true">
        <rect x="8" y="10" width="304" height="120" rx="12" fill="#15100d" />
        {frets.map((x) => (
          <line key={x} x1={x} y1={18} x2={x} y2={122} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
        ))}
        <line x1={40} y1={14} x2={40} y2={126} stroke="rgba(255,255,255,0.3)" strokeWidth={4} />
        {strings.map((s) => (
          <line
            key={s.y}
            x1={16}
            y1={s.y}
            x2={304}
            y2={s.y}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={s.thickness}
          />
        ))}
        {strings.map((s, i) => (
          <g key={s.y}>
            <circle cx={40} cy={s.y} r={9} fill="rgba(255,255,255,0.15)" />
            <circle cx={100} cy={s.y} r={9} fill="var(--color-ona-accent)" />
            <text
              x={100}
              y={s.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={600}
              fill="var(--color-ona-accent-foreground)"
            >
              {notes[i]}
            </text>
          </g>
        ))}
        <circle cx={130} cy={70} r={2.5} fill="rgba(255,255,255,0.3)" />
        <circle cx={190} cy={70} r={2.5} fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  );
}
