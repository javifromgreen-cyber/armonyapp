"use client";

import { useMemo } from "react";
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
import { territoryVisual } from "./territoryVisuals";
import { MapNode } from "./MapNode";
import { MapEdge } from "./MapEdge";

export interface HarmonicMapProps {
  context: Key;
  navPath: NavigationPath;
  progression: Progression;
  /** The candidate awaiting confirmation, if any (Phase R3.2 §2/§9) — owned by the reducer, not local state, since Back/Reset/context changes must clear it. */
  previewChord: Chord | null;
  /** Silent, informational-only hover target — owned by the parent so the side panel can show the same candidate's info (Phase R3.2 §11-12). */
  hoveredChord: Chord | null;
  onHoverChord: (chord: Chord | null) => void;
  /** First activation of a candidate, or switching to a different one while a preview is active — auditions confirmed path + candidate, never navigates (Phase R3.2 §1-4/§8). */
  onPreview: (chord: Chord) => void;
  /** Activating the already-previewed candidate again — confirms it as the new current chord (Phase R3.2 §5). */
  onConfirm: (chord: Chord) => void;
  /** Activating the current/center chord — replays the confirmed path without navigating (Phase R3.2 §17/§26). */
  onReplayCurrent: () => void;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  // next-intl expects a plain values record; Explanation.params already is one.
  return t(explanation.key, explanation.params);
}

/**
 * The harmonic path explorer (Phase R3.2): the current chord sits at the
 * center, every valid immediate outgoing option sits on ONE shared ring
 * around it, grouped into labeled TERRITORY sectors (natural/tension/
 * modal colour/substitution/exploration — see layout.ts) rather than the
 * undifferentiated single ring R3.1 shipped. First activation of a
 * candidate previews it (auditions the confirmed path + candidate, stays
 * put); activating that same candidate again confirms/navigates.
 * Hovering/focusing is purely silent and informational — it never sounds
 * anything, never sets preview state, never moves the path.
 */
export function HarmonicMap({
  context,
  navPath,
  progression,
  previewChord,
  hoveredChord,
  onHoverChord,
  onPreview,
  onConfirm,
  onReplayCurrent,
}: HarmonicMapProps) {
  const t = useTranslations();
  const tMap = useTranslations("app.map");
  const tDepth = useTranslations("app.navigation.depth");
  const tCharacter = useTranslations("app.navigation.character");
  const tTerritory = useTranslations("app.navigation.territory");

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

  function handleActivateCandidate(chord: Chord) {
    if (previewChord && chordsEqual(previewChord, chord)) {
      onConfirm(chord);
    } else {
      onPreview(chord);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${layout.size} ${layout.size}`}
      role="img"
      aria-label={tMap("sourceLabel", { chord: endpointLabel })}
      className="h-full w-full"
    >
      {/* Keyed by the current chord so the whole neighborhood remounts (and
          its CSS arrival animation retriggers) on every confirmed
          navigation — the "the map moved" cue. */}
      <g key={endpointLabel}>
        <g className="animate-map-arrive">
          {layout.sectors.map((sector) => {
            const visual = territoryVisual(sector.territory);
            return (
              <text
                key={sector.territory}
                x={sector.labelX}
                y={sector.labelY}
                textAnchor={sector.labelAnchor}
                dominantBaseline="central"
                className="pointer-events-none select-none text-[11px] font-semibold uppercase tracking-wide"
                style={{ fill: visual.colorVar }}
              >
                {visual.badge} {tTerritory(sector.territory)}
              </text>
            );
          })}

          {layout.nodes.map((positioned) => {
            const visual = territoryVisual(positioned.option.territory);
            const isPreviewed = !!previewChord && chordsEqual(previewChord, positioned.option.chord);
            return (
              <MapEdge
                key={chordSymbol(positioned.option.chord)}
                from={layout.center}
                to={{ x: positioned.x, y: positioned.y }}
                dashArray={visual.dashArray}
                colorVar={visual.colorVar}
                badge={visual.badge}
                title={explanationText(t, positioned.option.primaryRelationship.explanation)}
                isHighlighted={isPreviewed}
              />
            );
          })}

          {layout.nodes.map((positioned) => {
            const option = positioned.option;
            const label = chordSymbol(option.chord);
            const visual = territoryVisual(option.territory);
            const relationshipDescription = explanationText(t, option.primaryRelationship.explanation);
            const isHovered = !!hoveredChord && chordsEqual(hoveredChord, option.chord);
            const isPreviewed = !!previewChord && chordsEqual(previewChord, option.chord);
            const isTopRanked = chordIdentityKey(option.chord) === topRankedKey;
            const ariaLabel = tMap("nodeLabel", {
              chord: label,
              relationship: `${tTerritory(option.territory)} — ${relationshipDescription} — ${option.depth} ${tDepth(
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
                isPreviewed={isPreviewed}
                isTopRanked={isTopRanked}
                relationshipCount={option.relationships.length}
                depth={option.depth}
                colorVar={visual.colorVar}
                ariaLabel={ariaLabel}
                onHoverStart={() => onHoverChord(option.chord)}
                onHoverEnd={() => onHoverChord(null)}
                onActivate={() => handleActivateCandidate(option.chord)}
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
            onActivate={onReplayCurrent}
          />
        </g>
      </g>
    </svg>
  );
}
