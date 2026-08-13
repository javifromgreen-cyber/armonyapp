"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { chordSymbol, type Chord } from "@/domain/chords";
import { chordsEqual, type Explanation } from "@/domain/harmony";
import type { Key } from "@/domain/keys";
import type { Progression } from "@/domain/progression";
import {
  outgoingOptions,
  rankOptions,
  resolveHistoryContext,
  currentEndpoint,
  DEPTH_LABEL_KEY,
  type NavigationPath,
} from "@/domain/navigation";
import { computeRadialLayout, SOURCE_NODE_RADIUS, NEIGHBOR_NODE_RADIUS } from "./layout";
import { relationshipVisual } from "./relationshipVisuals";
import { MapNode } from "./MapNode";
import { MapEdge } from "./MapEdge";

export interface HarmonicMapProps {
  context: Key;
  navPath: NavigationPath;
  progression: Progression;
  previewChord: Chord | null;
  onAdvance: (chord: Chord) => void;
  onPreview: (chord: Chord) => void;
  onClearPreview: () => void;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  // next-intl expects a plain values record; Explanation.params already is one.
  return t(explanation.key, explanation.params);
}

/**
 * The harmonic path explorer (Phase R3, superseding Phase 4's static
 * neighborhood map): the current path endpoint sits at the center, every
 * valid outgoing option from it is shown at once (all four depths, no
 * manual Zoom gate — product-spec.md §4), and clicking an already-previewed
 * candidate advances the path directly (§10) rather than requiring a
 * separate "Explore from here" step. Hovering/focusing a candidate previews
 * it in the side panel without moving the path (§12).
 */
export function HarmonicMap({
  context,
  navPath,
  progression,
  previewChord,
  onAdvance,
  onPreview,
  onClearPreview,
}: HarmonicMapProps) {
  const t = useTranslations();
  const tMap = useTranslations("app.map");
  const tDepth = useTranslations("app.navigation.depth");

  const endpoint = currentEndpoint(navPath);

  const layout = useMemo(() => {
    const options = outgoingOptions(endpoint, context);
    const history = resolveHistoryContext(navPath, progression, context);
    const ranked = rankOptions(options, history);
    return computeRadialLayout(ranked);
  }, [endpoint, context, navPath, progression]);

  const endpointLabel = chordSymbol(endpoint);

  function handleActivate(chord: Chord) {
    if (previewChord && chordsEqual(previewChord, chord)) {
      onAdvance(chord);
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
      <g>
        {layout.nodes.map((positioned) => {
          const visual = relationshipVisual(positioned.option.primaryRelationship.relationshipType);
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
      </g>

      <MapNode
        x={layout.center.x}
        y={layout.center.y}
        radius={SOURCE_NODE_RADIUS}
        label={endpointLabel}
        variant="endpoint"
        isPreviewed={false}
        colorVar="var(--color-accent)"
        ariaLabel={tMap("sourceLabel", { chord: endpointLabel })}
        onPreview={() => {}}
        onLeavePreview={() => {}}
        onActivate={onClearPreview}
      />

      {layout.nodes.map((positioned) => {
        const option = positioned.option;
        const visual = relationshipVisual(option.primaryRelationship.relationshipType);
        const label = chordSymbol(option.chord);
        const relationshipDescription = explanationText(t, option.primaryRelationship.explanation);
        const isPreviewed = !!previewChord && chordsEqual(previewChord, option.chord);

        return (
          <MapNode
            key={label}
            x={positioned.x}
            y={positioned.y}
            radius={NEIGHBOR_NODE_RADIUS}
            label={label}
            variant="candidate"
            isPreviewed={isPreviewed}
            relationshipCount={option.relationships.length}
            depth={option.depth}
            depthLabel={tDepth(DEPTH_LABEL_KEY[option.depth])}
            colorVar={visual.colorVar}
            ariaLabel={tMap("nodeLabel", { chord: label, relationship: relationshipDescription })}
            onPreview={() => onPreview(option.chord)}
            onLeavePreview={onClearPreview}
            onActivate={() => handleActivate(option.chord)}
          />
        );
      })}
    </svg>
  );
}
