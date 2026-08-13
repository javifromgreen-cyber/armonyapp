"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { type Explanation } from "@/domain/harmony";
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
  /** The current chord — always the navigation history's endpoint (Phase R3.1: there is no separate previewed-candidate state, the panel simply follows navigation). */
  chord: Chord;
  /** The chord immediately before `chord` in navigation history, if any (undefined only at the very start) — used to show how we arrived here. */
  previousChord: Chord | undefined;
  context: Key;
  isDesktop: boolean;
  activeInstrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  /** The progression's current BPM (Phase 9 §24) — reused as-is for bass pattern step timing rather than introducing a second, unrelated tempo state. */
  bpm: number;
  /** Adds `chord` to the progression (product-spec.md Phase 5 §5: an explicit, distinct action from navigating). */
  onAddToProgression: (chord: Chord) => void;
  /** Purely auditory preview (Phase 6 §4) — must never navigate or mutate the progression. */
  onHearChord: (chord: Chord) => void;
  /** Plays EXACTLY the pitches of the currently displayed instrument voicing/pattern (Phase 7 §13 / Phase 8 §19 / Phase 9 §23), with real per-instrument sample-based timbre (Phase R2) — distinct from `onHearChord`'s generic neutral preview. Returns a promise so panels can show a brief loading state on that instrument's first use this session. */
  onHearPitches: (pitches: PlayablePitch[], options?: HearPitchesOptions) => Promise<void>;
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
 * The current-chord panel (product-spec.md §11, revised Phase R3.1):
 * identity, notes, interval formula, contextual role, and — when there is a
 * previous chord in navigation history — how we arrived here (depth,
 * character, explanation). No navigation controls live here anymore
 * (Phase R3.1 §5/§28): the map is the sole place clicking navigates, and
 * the transition is already heard automatically as part of that click, so
 * there is nothing left for this panel to trigger.
 */
export function ChordContextPanel({
  chord,
  previousChord,
  context,
  isDesktop,
  activeInstrument,
  onInstrumentChange,
  bpm,
  onAddToProgression,
  onHearChord,
  onHearPitches,
}: ChordContextPanelProps) {
  const t = useTranslations();
  const tPanel = useTranslations("app.panel");
  const tFunction = useTranslations("harmony.function");
  const tDepth = useTranslations("app.navigation.depth");
  const tCharacter = useTranslations("app.navigation.character");

  const info = useMemo(
    () => getChordDisplayInfo(chord, previousChord, context),
    [chord, previousChord, context],
  );
  const functionDisplay = useMemo(() => functionDisplayInfo(chord, context), [chord, context]);

  const [primaryArrival, ...additionalArrivals] = info.arrivalRelationships;

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

      {primaryArrival && previousChord && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            {tPanel("arrivedVia", { chord: chordSymbol(previousChord) })}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {primaryArrival.harmonicDepth} · {tDepth(DEPTH_LABEL_KEY[primaryArrival.harmonicDepth])}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {tCharacter(harmonicCharacterFor(primaryArrival))}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-foreground">{explanationText(t, primaryArrival.explanation)}</p>
          {additionalArrivals.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-foreground-muted">{tPanel("additionalRelationships")}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {additionalArrivals.map((relationship) => (
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
