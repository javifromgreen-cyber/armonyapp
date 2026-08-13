"use client";

import type { KeyboardEvent } from "react";

export interface MapNodeProps {
  x: number;
  y: number;
  radius: number;
  label: string;
  variant: "endpoint" | "candidate";
  /** True while this candidate is the panel's current inspection target (Phase R3 §12) — never true for `variant="endpoint"`. */
  isPreviewed: boolean;
  relationshipCount?: number;
  /** Depth badge (Phase R3 §9) — omitted for the endpoint, which has no incoming move of its own. */
  depth?: number;
  depthLabel?: string;
  colorVar: string;
  ariaLabel: string;
  /** Hover/focus — previews this candidate in the side panel without moving the path (Phase R3 §12). No-op for the endpoint. */
  onPreview: () => void;
  /** Mouse-leave/blur — returns the panel to the endpoint if this candidate was the preview. */
  onLeavePreview: () => void;
  /** Click/Enter/Space — advances the path directly if already previewed, otherwise previews (Phase R3 §10). For the endpoint, just clears any active preview. */
  onActivate: () => void;
}

/**
 * A single chord node — one per unique chord identity (never one per
 * relationship; see ../../domain/navigation/options.ts). Rendered as a
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
  isPreviewed,
  relationshipCount,
  depth,
  depthLabel,
  colorVar,
  ariaLabel,
  onPreview,
  onLeavePreview,
  onActivate,
}: MapNodeProps) {
  const isEndpoint = variant === "endpoint";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isPreviewed}
      onClick={onActivate}
      onMouseEnter={onPreview}
      onMouseLeave={onLeavePreview}
      onFocus={onPreview}
      onBlur={onLeavePreview}
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

      {isPreviewed && !isEndpoint && (
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
          fill: isEndpoint ? "var(--color-accent)" : "var(--color-surface-raised)",
          stroke: isEndpoint ? "var(--color-accent)" : colorVar,
          strokeWidth: isEndpoint ? 0 : 2,
        }}
      />

      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none font-medium"
        style={{
          fill: isEndpoint ? "var(--color-accent-foreground)" : "var(--color-foreground)",
          fontSize: isEndpoint ? 16 : 13,
        }}
      >
        {label}
      </text>

      {!!relationshipCount && relationshipCount > 1 && (
        <g transform={`translate(${radius - 2} ${-radius + 2})`}>
          <circle r={11} style={{ fill: "var(--color-accent)" }} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none font-semibold"
            style={{ fill: "var(--color-accent-foreground)", fontSize: 9 }}
          >
            {`+${relationshipCount - 1}`}
          </text>
        </g>
      )}

      {depth !== undefined && (
        <g transform={`translate(${-radius + 2} ${radius - 2})`}>
          <title>{depthLabel}</title>
          <circle r={9} style={{ fill: "var(--color-surface)", stroke: colorVar, strokeWidth: 1.5 }} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none font-semibold"
            style={{ fill: colorVar, fontSize: 9 }}
          >
            {depth}
          </text>
        </g>
      )}
    </g>
  );
}
