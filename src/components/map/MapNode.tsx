"use client";

import type { KeyboardEvent } from "react";

export interface MapNodeProps {
  x: number;
  y: number;
  radius: number;
  label: string;
  variant: "source" | "neighbor";
  isSelected: boolean;
  relationshipCount?: number;
  colorVar: string;
  ariaLabel: string;
  onSelect: () => void;
}

/**
 * A single chord node — one per unique chord identity (never one per
 * relationship; see ../../domain/graph/mapGraph.ts). Rendered as a
 * keyboard-accessible SVG `<g role="button">`, since SVG has no native
 * interactive circle element. The relationship-count badge is how "multiple
 * relationships connect to the same chord" stays visible without duplicating
 * the node (product-spec.md / architecture.md's "one node per chord" rule).
 */
export function MapNode({
  x,
  y,
  radius,
  label,
  variant,
  isSelected,
  relationshipCount,
  colorVar,
  ariaLabel,
  onSelect,
}: MapNodeProps) {
  const isSource = variant === "source";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer outline-none"
      style={{ transition: "transform 300ms ease" }}
    >
      <title>{ariaLabel}</title>

      {/* focus ring — SVG has no native focus-visible outline, so this
          circle is invisible until the parent <g> receives keyboard focus */}
      <circle
        r={radius + 6}
        fill="none"
        strokeWidth={2}
        className="stroke-transparent transition-colors group-focus-visible:stroke-accent"
      />

      {isSelected && !isSource && (
        <circle
          r={radius + 6}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      )}

      <circle
        r={radius}
        className="transition-[filter] duration-150 group-hover:brightness-110"
        style={{
          fill: isSource ? "var(--color-accent)" : "var(--color-surface-raised)",
          stroke: isSource ? "var(--color-accent)" : colorVar,
          strokeWidth: isSource ? 0 : 2,
        }}
      />

      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none font-medium"
        style={{
          fill: isSource ? "var(--color-accent-foreground)" : "var(--color-foreground)",
          fontSize: isSource ? 16 : 13,
        }}
      >
        {label}
      </text>

      {!!relationshipCount && relationshipCount > 1 && (
        <g transform={`translate(${radius - 4} ${-radius + 4})`}>
          <circle r={9} style={{ fill: "var(--color-accent)" }} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none font-semibold"
            style={{ fill: "var(--color-accent-foreground)", fontSize: 10 }}
          >
            {relationshipCount}
          </text>
        </g>
      )}
    </g>
  );
}
