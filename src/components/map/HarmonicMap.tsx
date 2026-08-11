"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { chordSymbol, type Chord } from "@/domain/chords";
import { chordsEqual, type Explanation } from "@/domain/harmony";
import { relationshipsFrom, groupRelationshipsByTarget } from "@/domain/graph";
import type { Key } from "@/domain/keys";
import type { ZoomLevel } from "@/domain/harmony";
import { computeRadialLayout, SOURCE_NODE_RADIUS, NEIGHBOR_NODE_RADIUS } from "./layout";
import { relationshipVisual } from "./relationshipVisuals";
import { MapNode } from "./MapNode";
import { MapEdge } from "./MapEdge";

export interface HarmonicMapProps {
  context: Key;
  exploredChord: Chord;
  selectedChord: Chord;
  zoom: ZoomLevel;
  onSelect: (chord: Chord) => void;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  // next-intl expects a plain values record; Explanation.params already is one.
  return t(explanation.key, explanation.params);
}

export function HarmonicMap({
  context,
  exploredChord,
  selectedChord,
  zoom,
  onSelect,
}: HarmonicMapProps) {
  const t = useTranslations();
  const tMap = useTranslations("app.map");

  const layout = useMemo(() => {
    const edges = relationshipsFrom(exploredChord, context, zoom);
    const nodes = groupRelationshipsByTarget(edges);
    return computeRadialLayout(nodes);
  }, [exploredChord, context, zoom]);

  const sourceLabel = chordSymbol(exploredChord);
  const sourceSelected = chordsEqual(exploredChord, selectedChord);

  return (
    <svg
      viewBox={`0 0 ${layout.size} ${layout.size}`}
      role="img"
      aria-label={tMap("sourceLabel", { chord: sourceLabel })}
      className="h-full w-full"
    >
      <g>
        {layout.nodes.map((positioned) => {
          const visual = relationshipVisual(positioned.node.primaryRelationship.relationshipType);
          return (
            <MapEdge
              key={chordSymbol(positioned.node.chord)}
              from={layout.center}
              to={{ x: positioned.x, y: positioned.y }}
              dashArray={visual.dashArray}
              colorVar={visual.colorVar}
              badge={visual.badge}
              title={explanationText(t, positioned.node.primaryRelationship.explanation)}
              isHighlighted={chordsEqual(positioned.node.chord, selectedChord)}
            />
          );
        })}
      </g>

      <MapNode
        x={layout.center.x}
        y={layout.center.y}
        radius={SOURCE_NODE_RADIUS}
        label={sourceLabel}
        variant="source"
        isSelected={sourceSelected}
        colorVar="var(--color-accent)"
        ariaLabel={tMap("sourceLabel", { chord: sourceLabel })}
        onSelect={() => onSelect(exploredChord)}
      />

      {layout.nodes.map((positioned) => {
        const visual = relationshipVisual(positioned.node.primaryRelationship.relationshipType);
        const label = chordSymbol(positioned.node.chord);
        const relationshipDescription = explanationText(
          t,
          positioned.node.primaryRelationship.explanation,
        );

        return (
          <MapNode
            key={label}
            x={positioned.x}
            y={positioned.y}
            radius={NEIGHBOR_NODE_RADIUS}
            label={label}
            variant="neighbor"
            isSelected={chordsEqual(positioned.node.chord, selectedChord)}
            relationshipCount={positioned.node.relationships.length}
            colorVar={visual.colorVar}
            ariaLabel={tMap("nodeLabel", { chord: label, relationship: relationshipDescription })}
            onSelect={() => onSelect(positioned.node.chord)}
          />
        );
      })}
    </svg>
  );
}
