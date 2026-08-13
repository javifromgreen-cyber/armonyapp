"use client";

import type { KeyboardEvent } from "react";

export interface MapNodeProps {
  x: number;
  y: number;
  radius: number;
  label: string;
  variant: "current" | "candidate";
  /** Silent, visual-only hover/focus state (Phase R3.2 §11/§13) — never triggers audio, never sets preview state. Always false for `variant="current"`. */
  isHovered: boolean;
  /** The candidate has been clicked once and is awaiting confirmation (Phase R3.2 §9/§10) — visually distinct from both plain and merely-hovered, and from the current chord itself. Always false for `variant="current"`. */
  isPreviewed?: boolean;
  /** A light visual accent for the single most contextually relevant candidate ("ranking organizes... never as position/deletion"). */
  isTopRanked?: boolean;
  relationshipCount?: number;
  /** Depth badge — metadata about the move, never expressed as radial position or territory colour (Phase R3.2 §36: depth must not compete with territory identity). Omitted for the current chord. */
  depth?: number;
  colorVar: string;
  ariaLabel: string;
  /** Hover/focus — silent, informational only (Phase R3.2 §11-13). No-op for the current chord. */
  onHoverStart: () => void;
  onHoverEnd: () => void;
  /**
   * Click/tap/Enter/Space. For a candidate: first activation previews it,
   * activating the already-previewed candidate again confirms/navigates
   * (Phase R3.2 §1-8) — the branching itself lives in the parent, this
   * component just reports the activation. For the current chord: replays
   * the confirmed exploration path without navigating (§17/§26).
   */
  onActivate: () => void;
}

/**
 * A single chord node — one per unique chord identity (never one per
 * relationship; see ../../domain/navigation/options.ts). Rendered as a
 * keyboard-accessible SVG `<g role="button">` — the current chord is
 * clickable too now (Phase R3.2 §17: replays the confirmed path). The
 * relationship-count badge is how "multiple relationships connect to the
 * same chord" stays visible without duplicating the node.
 */
export function MapNode({
  x,
  y,
  radius,
  label,
  variant,
  isHovered,
  isPreviewed,
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
      aria-pressed={isPreviewed || undefined}
      onClick={onActivate}
      onMouseEnter={isCurrent ? undefined : onHoverStart}
      onMouseLeave={isCurrent ? undefined : onHoverEnd}
      onFocus={isCurrent ? undefined : onHoverStart}
      onBlur={isCurrent ? undefined : onHoverEnd}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer select-none outline-none"
    >
      <title>{ariaLabel}</title>

      <circle
        r={radius + 6}
        fill="none"
        strokeWidth={2}
        className="stroke-transparent transition-colors group-focus-visible:stroke-accent"
      />

      {/* Preview state: a solid, thicker accent ring — clearly more than a
          hover hint, clearly not the filled "current chord" treatment
          (Phase R3.2 §9/§10). */}
      {isPreviewed && !isCurrent && (
        <circle r={radius + 9} fill="none" stroke="var(--color-accent)" strokeWidth={3} />
      )}

      {/* Hover state (only when not already previewed, to avoid a
          redundant double ring): a light dashed ring — silent, informational. */}
      {isHovered && !isPreviewed && !isCurrent && (
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
          <circle r={9} style={{ fill: "var(--color-surface)", stroke: "var(--color-foreground-muted)", strokeWidth: 1.5 }} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none select-none font-semibold"
            style={{ fill: "var(--color-foreground-muted)", fontSize: 9 }}
          >
            {depth}
          </text>
        </g>
      )}
    </g>
  );
}
