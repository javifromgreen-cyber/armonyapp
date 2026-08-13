"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { chordsEqual, type Explanation } from "@/domain/harmony";
import { chordSymbol, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import type { PlayablePitch } from "@/domain/instruments";
import type { HearPitchesOptions } from "@/audio/player";
import { harmonicCharacterFor, DEPTH_LABEL_KEY } from "@/domain/navigation";
import { getChordDisplayInfo } from "./chordDisplayInfo";
import { functionDisplayInfo } from "./functionDisplay";
import { PianoVoicingPanel } from "./piano/PianoVoicingPanel";
import { GuitarVoicingPanel } from "./guitar/GuitarVoicingPanel";
import { BassPatternPanel } from "./bass/BassPatternPanel";
import { InstrumentSelector } from "./InstrumentSelector";
import type { Instrument } from "./instrument";

export interface ChordContextPanelProps {
  /** The chord currently shown — the previewed candidate if any, otherwise the path's current endpoint (Phase R3 §12). */
  chord: Chord;
  /** The map's current path endpoint (Phase R3) — what `chord` is shown relative to. */
  endpointChord: Chord;
  context: Key;
  isDesktop: boolean;
  activeInstrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  /** The progression's current BPM (Phase 9 §24) — reused as-is for bass pattern step timing rather than introducing a second, unrelated tempo state. */
  bpm: number;
  /**
   * Commits `chord` as the new path endpoint — normal navigation happens by
   * clicking the map directly (Phase R3 §10), so this is only surfaced here
   * as a lightweight fallback for committing an already-previewed candidate
   * from the panel itself (useful on mobile, where the map may be out of
   * view once the panel/bottom sheet is open). Never shown for the endpoint
   * itself. Not the old "Explore from here" — that unconditional
   * second-click step is removed (§11).
   */
  onAdvance: (chord: Chord) => void;
  /** Adds `chord` — the panel's currently displayed chord, never `endpointChord` — to the progression (product-spec.md Phase 5 §5: an explicit, distinct action from navigating/previewing). */
  onAddToProgression: (chord: Chord) => void;
  /** Purely auditory preview (Phase 6 §4) — must never select/explore/add. */
  onHearChord: (chord: Chord) => void;
  /** Plays EXACTLY the pitches of the currently displayed instrument voicing/pattern (Phase 7 §13 / Phase 8 §19 / Phase 9 §23), with real per-instrument sample-based timbre (Phase R2) — distinct from `onHearChord`'s generic neutral preview. Returns a promise so panels can show a brief loading state on that instrument's first use this session. */
  onHearPitches: (pitches: PlayablePitch[], options?: HearPitchesOptions) => Promise<void>;
  /** Auditions the move from the current endpoint to a previewed candidate, without committing it (Phase R3 §25/§26). Only meaningful (and only shown) when `chord` isn't already the endpoint. */
  onHearTransition: (from: Chord, to: Chord) => Promise<void>;
}

/** A very light, guitar-like onset stagger (Phase 8 §20) — not a sound-design project, just a small delay between successive strings. */
const GUITAR_STRUM_DELAY_SECONDS = 0.02;
/** How much of each bass pattern step's duration actually sounds (Phase 9 §24) — leaves a clean gap before the next note, mirroring the progression player's own ~8%-early-release convention rather than letting notes bleed together. */
const BASS_STEP_SOUNDING_RATIO = 0.85;

function explanationText(
  t: ReturnType<typeof useTranslations>,
  explanation: Explanation,
): string {
  return t(explanation.key, explanation.params);
}

/**
 * The selected/previewed-chord panel (product-spec.md §11, revised Phase
 * R3): identity, notes, interval formula, contextual role, and — when
 * `chord` isn't the path endpoint itself — its relationship to the
 * endpoint, including the move's depth and harmonic character (§7/§23/§24).
 * Deliberately has no "Explore from here" button (§11); normal path
 * navigation happens by clicking the map (§10).
 */
export function ChordContextPanel({
  chord,
  endpointChord,
  context,
  isDesktop,
  activeInstrument,
  onInstrumentChange,
  bpm,
  onAdvance,
  onAddToProgression,
  onHearChord,
  onHearPitches,
  onHearTransition,
}: ChordContextPanelProps) {
  const t = useTranslations();
  const tPanel = useTranslations("app.panel");
  const tFunction = useTranslations("harmony.function");
  const tDepth = useTranslations("app.navigation.depth");
  const tCharacter = useTranslations("app.navigation.character");

  const info = useMemo(
    () => getChordDisplayInfo(chord, endpointChord, context),
    [chord, endpointChord, context],
  );
  const functionDisplay = useMemo(() => functionDisplayInfo(chord, context), [chord, context]);

  const isEndpoint = chordsEqual(chord, endpointChord);
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

      {!isEndpoint && primaryRelationship && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            {tPanel("relationshipToSource", { chord: chordSymbol(endpointChord) })}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {primaryRelationship.harmonicDepth} · {tDepth(DEPTH_LABEL_KEY[primaryRelationship.harmonicDepth])}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {tCharacter(harmonicCharacterFor(primaryRelationship))}
            </span>
          </div>
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

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {tPanel("instrument")}
        </h3>
        <InstrumentSelector value={activeInstrument} onChange={onInstrumentChange} />
      </div>

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

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => onHearChord(chord)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {tPanel("hearChord")}
        </button>
        {!isEndpoint && (
          <button
            type="button"
            onClick={() => onHearTransition(endpointChord, chord)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("app.navigation.hearTransition")}
          </button>
        )}
        {!isEndpoint && (
          <button
            type="button"
            onClick={() => onAdvance(chord)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("app.navigation.continueHere")}
          </button>
        )}
        <button
          type="button"
          onClick={() => onAddToProgression(chord)}
          className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {tPanel("addToProgression")}
        </button>
      </div>
    </div>
  );
}
