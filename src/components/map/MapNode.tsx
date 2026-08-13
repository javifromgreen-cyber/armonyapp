"use client";

import type { KeyboardEvent } from "react";

export interface MapNodeProps {
  x: number;
  y: number;
  radius: number;
  label: string;
  variant: "current" | "candidate";
  /** Silent, visual-only hover/focus state (Phase R3.1 §29/§31) — never triggers audio or navigation, purely informational. Always false for `variant="current"`. */
  isHovered: boolean;
  /** A light visual accent for the single most contextually relevant candidate (Phase R3.1 §21's "ranking organizes" preserved as emphasis, never as position). */
  isTopRanked?: boolean;
  relationshipCount?: number;
  /** Depth badge (Phase R3.1 §19) — metadata about the move, never expressed as radial position. Omitted for the current chord, which has no incoming move of its own to badge. */
  depth?: number;
  colorVar: string;
  ariaLabel: string;
  /** Hover/focus — silent, informational only (Phase R3.1 §29). No-op for the current chord. */
  onHoverStart: () => void;
  onHoverEnd: () => void;
  /** Click/tap/Enter/Space on a candidate — plays the transition and navigates there in one action (Phase R3.1 §5/§6/§31). No-op for the current chord (it isn't a destination). */
  onActivate: () => void;
}

/**
 * A single chord node — one per unique chord identity (never one per
 * relationship; see ../../domain/navigation/options.ts). Rendered as a
 * keyboard-accessible SVG `<g role="button">` for candidates (the current
 * chord is a status display, not a control). The relationship-count badge
 * is how "multiple relationships connect to the same chord" stays visible
 * without duplicating the node.
 */
export function MapNode({
  x,
  y,
  radius,
  label,
  variant,
  isHovered,
  isTopRanked,
  relationshipCount,
  depth,
  colorVar,
  ariaLabel,
  onHoverStart,
  onHoverEnd,
  onActivate,
}: MapNodeProps) {
  const isCurrent = variant === "current";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (!isCurrent && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      tabIndex={isCurrent ? -1 : 0}
      role={isCurrent ? "status" : "button"}
      aria-label={ariaLabel}
      onClick={isCurrent ? undefined : onActivate}
      onMouseEnter={isCurrent ? undefined : onHoverStart}
      onMouseLeave={isCurrent ? undefined : onHoverEnd}
      onFocus={isCurrent ? undefined : onHoverStart}
      onBlur={isCurrent ? undefined : onHoverEnd}
      onKeyDown={handleKeyDown}
      className={isCurrent ? "select-none" : "group cursor-pointer select-none outline-none"}
    >
      <title>{ariaLabel}</title>

      {!isCurrent && (
        <circle
          r={radius + 6}
          fill="none"
          strokeWidth={2}
          className="stroke-transparent transition-colors group-focus-visible:stroke-accent"
        />
      )}

      {isHovered && !isCurrent && (
        <circle r={radius + 6} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeDasharray="3 3" />
      )}

      <circle
        r={radius}
        className={isCurrent ? "" : "transition-[filter] duration-150 group-hover:brightness-110"}
        style={{
          fill: isCurrent ? "var(--color-accent)" : "var(--color-surface-raised)",
          stroke: isCurrent ? "var(--color-accent)" : colorVar,
          strokeWidth: isCurrent ? 0 : isTopRanked ? 3 : 2,
        }}
      />

      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none font-medium"
        style={{
          fill: isCurrent ? "var(--color-accent-foreground)" : "var(--color-foreground)",
          fontSize: isCurrent ? 18 : 13,
          fontWeight: isCurrent ? 700 : undefined,
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
