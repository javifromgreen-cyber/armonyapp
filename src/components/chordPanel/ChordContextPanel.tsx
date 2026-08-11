"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { chordsEqual, type Explanation } from "@/domain/harmony";
import { chordSymbol, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { getChordDisplayInfo } from "./chordDisplayInfo";
import { functionDisplayInfo } from "./functionDisplay";

export interface ChordContextPanelProps {
  chord: Chord;
  sourceChord: Chord;
  context: Key;
  onExploreFrom: (chord: Chord) => void;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  return t(explanation.key, explanation.params);
}

/**
 * The first version of the selected-chord panel (product-spec.md §11):
 * identity, notes, interval formula, contextual role, and relationship to
 * the currently explored chord — musical/contextual information only.
 * Deliberately has no instrument content yet (guitar/piano/bass are Phase
 * 7-9); the layout leaves room for an instrument section to be added later
 * without restructuring.
 */
export function ChordContextPanel({
  chord,
  sourceChord,
  context,
  onExploreFrom,
}: ChordContextPanelProps) {
  const t = useTranslations();
  const tPanel = useTranslations("app.panel");
  const tFunction = useTranslations("harmony.function");

  const info = useMemo(
    () => getChordDisplayInfo(chord, sourceChord, context),
    [chord, sourceChord, context],
  );
  const functionDisplay = useMemo(() => functionDisplayInfo(chord, context), [chord, context]);

  const isSource = chordsEqual(chord, sourceChord);
  const [primaryRelationship, ...additionalRelationships] = info.relationshipsFromSource;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{info.symbol}</h2>
        {functionDisplay && (
          <p className="mt-1 text-sm text-foreground-muted">
            {functionDisplay.romanNumeral && (
              <span className="font-medium text-foreground">{functionDisplay.romanNumeral} · </span>
            )}
            {tFunction(functionDisplay.labelKey)}
          </p>
        )}
      </div>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {tPanel("notes")}
        </h3>
        <p className="mt-1.5 text-base text-foreground">{info.noteNames.join(" — ")}</p>
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {tPanel("intervalFormula")}
        </h3>
        <p className="mt-1.5 font-mono text-base text-foreground">
          {info.intervalFormula.join("  ")}
        </p>
      </section>

      {!isSource && primaryRelationship && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            {tPanel("relationshipToSource", { chord: chordSymbol(sourceChord) })}
          </h3>
          <p className="mt-1.5 text-sm text-foreground">
            {explanationText(t, primaryRelationship.explanation)}
          </p>
          {additionalRelationships.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-foreground-muted">{tPanel("additionalRelationships")}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {additionalRelationships.map((relationship) => (
                  <li key={relationship.relationshipType} className="text-sm text-foreground-muted">
                    {explanationText(t, relationship.explanation)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        {!isSource && (
          <button
            type="button"
            onClick={() => onExploreFrom(chord)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("app.map.exploreFrom")}
          </button>
        )}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={tPanel("comingSoon")}
          className="cursor-not-allowed rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-muted opacity-60"
        >
          {tPanel("addToProgression")}
        </button>
      </div>
    </div>
  );
}
