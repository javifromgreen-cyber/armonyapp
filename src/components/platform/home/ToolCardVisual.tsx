const NODE_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * A lightweight, purely decorative echo of Armony's harmonic map (a center
 * node with satellites) for the marketing card — product-spec.md §11 asks
 * for "a lightweight visual reference" while explicitly forbidding
 * invoking real harmony logic just to render it. Static geometry only, no
 * `@/domain` import.
 */
export function ToolCardVisual() {
  const radius = 60;
  const center = 90;

  return (
    <div className="flex h-40 items-center justify-center bg-ona-bg">
      <svg width="180" height="140" viewBox="0 0 180 140" aria-hidden="true">
        {NODE_ANGLES.map((angle) => {
          const radians = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(radians);
          const y = 70 + radius * Math.sin(radians) * 0.6;
          return (
            <line
              key={`edge-${angle}`}
              x1={center}
              y1={70}
              x2={x}
              y2={y}
              stroke="var(--ona-border)"
              strokeWidth="1"
            />
          );
        })}
        {NODE_ANGLES.map((angle) => {
          const radians = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(radians);
          const y = 70 + radius * Math.sin(radians) * 0.6;
          return <circle key={`node-${angle}`} cx={x} cy={y} r="4" fill="var(--ona-fg-muted)" />;
        })}
        <circle cx={center} cy={70} r="7" fill="var(--ona-accent)" />
      </svg>
    </div>
  );
}
