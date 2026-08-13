"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { type Explanation } from "@/domain/harmony";
import { chordSymbol, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import type { InstrumentName, PlayablePitch } from "@/domain/instruments";
import type { HearPitchesOptions } from "@/audio/player";
import { harmonicCharacterFor, harmonicTerritoryFor, DEPTH_LABEL_KEY } from "@/domain/navigation";
import { getChordDisplayInfo } from "./chordDisplayInfo";
import { functionDisplayInfo } from "./functionDisplay";
import { PianoVoicingPanel } from "./piano/PianoVoicingPanel";
import { GuitarVoicingPanel } from "./guitar/GuitarVoicingPanel";
import { BassPatternPanel } from "./bass/BassPatternPanel";

/** What the panel is currently showing (Phase R3.2 §9/§12/§38) — drives which heading/hint copy applies; the underlying data (`chord`/`relativeToChord`) is the same shape regardless. */
export type PanelMode = "current" | "hover" | "preview";

export interface ChordContextPanelProps {
  /** The chord currently shown — the hovered candidate if any, else the previewed candidate if any, else the confirmed current chord (Phase R3.2 §11/§38). */
  chord: Chord;
  panelMode: PanelMode;
  /** What `chord`'s relationship info is shown relative to: the confirmed current chord when hovering/previewing a candidate, or the previous confirmed chord when showing the current chord itself ("arrived via"). Undefined only at the very start, with no predecessor. */
  relativeToChord: Chord | undefined;
  context: Key;
  isDesktop: boolean;
  /** The ONE global instrument (Phase R3.3 §6-8) — set exclusively by the toolbar's `InstrumentSelector`; this panel only READS it to decide which sub-panel (Piano/Guitar/Bass) to render. No instrument-choice control lives here anymore (§7 — the old right-panel selector was a duplicate of the global one and is removed). */
  activeInstrument: InstrumentName;
  /** The progression's current BPM (Phase 9 §24) — reused as-is for bass pattern step timing rather than introducing a second, unrelated tempo state. */
  bpm: number;
  /** Purely auditory preview of ONLY this chord, isolated from any exploration route (Phase R3.2 §42/§43 — "Hear this chord only") — must never navigate or mutate the progression. Uses the global instrument (Phase R3.3 §71) for coherence with the rest of the UI. */
  onHearChord: (chord: Chord) => void;
  /** Plays EXACTLY the pitches of the currently displayed instrument voicing/pattern (Phase 7 §13 / Phase 8 §19 / Phase 9 §23), with real per-instrument sample-based timbre (Phase R2) — distinct from `onHearChord`'s generic neutral preview. Returns a promise so panels can show a brief loading state on that instrument's first use this session. */
  onHearPitches: (pitches: PlayablePitch[], options?: HearPitchesOptions) => Promise<void>;
}

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  return t(explanation.key, explanation.params);
}

/**
 * The chord panel (product-spec.md §11, revised Phase R3.2): identity,
 * notes, interval formula, contextual role, and — layered beginner-first
 * then technical (§12/§16) — the relationship/territory/depth info for
 * whatever `chord` currently represents (the confirmed current chord, a
 * silently-hovered candidate, or an actively-previewed one). No navigation
 * controls live here — the map is the sole place clicking
 * previews/confirms, and preview auditions already happen automatically as
 * part of that click.
 */
export function ChordContextPanel({
  chord,
  panelMode,
  relativeToChord,
  context,
  isDesktop,
  activeInstrument,
  bpm,
  onHearChord,
  onHearPitches,
}: ChordContextPanelProps) {
  const t = useTranslations();
  const tPanel = useTranslations("app.panel");
  const tFunction = useTranslations("harmony.function");
  const tDepth = useTranslations("app.navigation.depth");
  const tDepthBlurb = useTranslations("app.navigation.depthBlurb");
  const tCharacter = useTranslations("app.navigation.character");
  const tTerritory = useTranslations("app.navigation.territory");
  const tTerritoryBlurb = useTranslations("app.navigation.territoryBlurb");
  const tNav = useTranslations("app.navigation");

  const info = useMemo(
    () => getChordDisplayInfo(chord, relativeToChord, context),
    [chord, relativeToChord, context],
  );
  const functionDisplay = useMemo(() => functionDisplayInfo(chord, context), [chord, context]);

  const [primaryRelationship, ...additionalRelationships] = info.arrivalRelationships;
  const territory = primaryRelationship ? harmonicTerritoryFor(primaryRelationship) : undefined;
  const relationshipHeadingKey = panelMode === "current" ? "arrivedVia" : "relationshipToCurrent";

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

      {panelMode === "preview" && (
        <div className="rounded-lg border border-accent bg-accent/10 px-3 py-2">
          <p className="text-sm font-semibold text-accent">{tNav("previewing")}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {isDesktop ? tNav("previewHintDesktop") : tNav("previewHintMobile")}
          </p>
        </div>
      )}

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

      {primaryRelationship && relativeToChord && territory && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            {tPanel(relationshipHeadingKey, { chord: chordSymbol(relativeToChord) })}
          </h3>

          <div className="mt-1.5 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">{tTerritory(territory)}</p>
            <p className="mt-0.5 text-sm text-foreground-muted">{tTerritoryBlurb(territory)}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {tPanel("depthSummary", {
                depth: primaryRelationship.harmonicDepth,
                label: tDepth(DEPTH_LABEL_KEY[primaryRelationship.harmonicDepth]),
              })}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {tCharacter(harmonicCharacterFor(primaryRelationship))}
            </span>
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            {tDepthBlurb(String(primaryRelationship.harmonicDepth))}
          </p>

          <p className="mt-2 text-sm text-foreground">{explanationText(t, primaryRelationship.explanation)}</p>
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

      {activeInstrument === "piano" && (
        <PianoVoicingPanel
          key={`piano-${info.symbol}`}
          chord={chord}
          isDesktop={isDesktop}
          onHearVoicing={(voicing) => onHearPitches(voicing.pitches, { voice: "piano" })}
        />
      )}
      {activeInstrument === "guitar" && (
        <GuitarVoicingPanel
          key={`guitar-${info.symbol}`}
          chord={chord}
          onHearVoicing={(voicing) =>
            onHearPitches(
              voicing.strings.filter((s) => s.pitch).map((s) => s.pitch!),
              { strumDelaySeconds: GUITAR_STRUM_DELAY_SECONDS, voice: "guitar" },
            )
          }
        />
      )}
      {activeInstrument === "bass" && (
        <BassPatternPanel
          key={`bass-${info.symbol}`}
          chord={chord}
          isDesktop={isDesktop}
          onHearPattern={(pattern) => {
            const stepSeconds = 60 / bpm;
            return onHearPitches(
              pattern.steps.map((s) => s.pitch),
              {
                strumDelaySeconds: stepSeconds,
                durationSeconds: stepSeconds * BASS_STEP_SOUNDING_RATIO,
                voice: "bass",
              },
            );
          }}
        />
      )}

      <div className="mt-auto border-t border-border pt-4">
        <button
          type="button"
          onClick={() => onHearChord(chord)}
          className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {tPanel("hearChord")}
        </button>
      </div>
    </div>
  );
}

/** A very light, guitar-like onset stagger (Phase 8 §20) — not a sound-design project, just a small delay between successive strings. */
const GUITAR_STRUM_DELAY_SECONDS = 0.02;
/** How much of each bass pattern step's duration actually sounds (Phase 9 §24) — leaves a clean gap before the next note, mirroring the progression player's own ~8%-early-release convention rather than letting notes bleed together. */
const BASS_STEP_SOUNDING_RATIO = 0.85;
