"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { chordSymbol, type Chord } from "@/domain/chords";
import { chordsEqual, chordIdentityKey, type Explanation } from "@/domain/harmony";
import type { Key } from "@/domain/keys";
import type { Progression } from "@/domain/progression";
import {
  outgoingOptions,
  rankOptions,
  resolveHistoryContext,
  currentEndpoint,
  harmonicCharacterFor,
  DEPTH_LABEL_KEY,
  type NavigationPath,
} from "@/domain/navigation";
import { computeRadialLayout, CURRENT_NODE_RADIUS, CANDIDATE_NODE_RADIUS } from "./layout";
import { relationshipVisual } from "./relationshipVisuals";
import { MapNode } from "./MapNode";
import { MapEdge } from "./MapEdge";

export interface HarmonicMapProps {
  context: Key;
  navPath: NavigationPath;
  progression: Progression;
  /** A single click/tap/Enter on a candidate: play the transition and commit it as the new endpoint, all at once (Phase R3.1 §5/§6/§10) — the only way anything here navigates or makes sound. */
  onNavigate: (chord: Chord) => void;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  // next-intl expects a plain values record; Explanation.params already is one.
  return t(explanation.key, explanation.params);
}

/**
 * The harmonic path explorer (Phase R3.1, correcting R3's map interaction):
 * the current chord sits at the center, every valid immediate outgoing
 * option sits on ONE shared ring around it (never staged into depth rings
 * that read as a chain — see layout.ts), and a single click/tap/Enter on a
 * candidate both plays the transition and navigates there. Hovering/
 * focusing a candidate is purely silent, local, informational (§29) — it
 * never sounds anything and never moves the path.
 */
export function HarmonicMap({ context, navPath, progression, onNavigate }: HarmonicMapProps) {
  const t = useTranslations();
  const tMap = useTranslations("app.map");
  const tDepth = useTranslations("app.navigation.depth");
  const tCharacter = useTranslations("app.navigation.character");

  const [hoveredChord, setHoveredChord] = useState<Chord | null>(null);

  const endpointLabel = chordSymbol(currentEndpoint(navPath));

  const { layout, topRankedKey } = useMemo(() => {
    const options = outgoingOptions(currentEndpoint(navPath), context);
    const history = resolveHistoryContext(navPath, progression, context);
    const ranked = rankOptions(options, history);
    return {
      layout: computeRadialLayout(ranked),
      topRankedKey: ranked.length > 0 ? chordIdentityKey(ranked[0].chord) : null,
    };
  }, [context, navPath, progression]);

  return (
    <svg
      viewBox={`0 0 ${layout.size} ${layout.size}`}
      role="img"
      aria-label={tMap("sourceLabel", { chord: endpointLabel })}
      className="h-full w-full"
    >
      {/* Keyed by the current chord so the whole neighborhood remounts (and
          its CSS arrival animation retriggers) on every navigation — the
          "the map moved" cue from Phase R3.1 §13/§37. */}
      <g key={endpointLabel}>
        <g className="animate-map-arrive">
          {layout.nodes.map((positioned) => {
            const visual = relationshipVisual(positioned.option.primaryRelationship.relationshipType);
            const isHovered = !!hoveredChord && chordsEqual(hoveredChord, positioned.option.chord);
            return (
              <MapEdge
                key={chordSymbol(positioned.option.chord)}
                from={layout.center}
                to={{ x: positioned.x, y: positioned.y }}
                dashArray={visual.dashArray}
                colorVar={visual.colorVar}
                badge={visual.badge}
                title={explanationText(t, positioned.option.primaryRelationship.explanation)}
                isHighlighted={isHovered}
              />
            );
          })}

          {layout.nodes.map((positioned) => {
            const option = positioned.option;
            const label = chordSymbol(option.chord);
            const visual = relationshipVisual(option.primaryRelationship.relationshipType);
            const relationshipDescription = explanationText(t, option.primaryRelationship.explanation);
            const isHovered = !!hoveredChord && chordsEqual(hoveredChord, option.chord);
            const isTopRanked = chordIdentityKey(option.chord) === topRankedKey;
            const ariaLabel = tMap("nodeLabel", {
              chord: label,
              relationship: `${relationshipDescription} — ${option.depth} ${tDepth(
                DEPTH_LABEL_KEY[option.depth],
              )} · ${tCharacter(harmonicCharacterFor(option.primaryRelationship))}`,
            });

            return (
              <MapNode
                key={label}
                x={positioned.x}
                y={positioned.y}
                radius={CANDIDATE_NODE_RADIUS}
                label={label}
                variant="candidate"
                isHovered={isHovered}
                isTopRanked={isTopRanked}
                relationshipCount={option.relationships.length}
                depth={option.depth}
                colorVar={visual.colorVar}
                ariaLabel={ariaLabel}
                onHoverStart={() => setHoveredChord(option.chord)}
                onHoverEnd={() => setHoveredChord(null)}
                onActivate={() => onNavigate(option.chord)}
              />
            );
          })}
        </g>

        <g className="animate-current-arrive">
          <MapNode
            x={layout.center.x}
            y={layout.center.y}
            radius={CURRENT_NODE_RADIUS}
            label={endpointLabel}
            variant="current"
            isHovered={false}
            colorVar="var(--color-accent)"
            ariaLabel={tMap("sourceLabel", { chord: endpointLabel })}
            onHoverStart={() => {}}
            onHoverEnd={() => {}}
            onActivate={() => {}}
          />
        </g>
      </g>
    </svg>
  );
}
