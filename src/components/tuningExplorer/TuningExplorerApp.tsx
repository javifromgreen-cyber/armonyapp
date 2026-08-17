"use client";

import { useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { INSTRUMENT_CONFIGS } from "@/domain/tuningExplorer";
import { playNote, playOpenStrings, TuningExplorerAudioInitError } from "@/audio/tuningExplorerPlayer";
import {
  tuningExplorerReducer,
  initialTuningExplorerState,
  currentOpenStringsMidi,
  currentPresetName,
} from "./tuningExplorerState";
import { InstrumentPills, StringCountPills } from "./InstrumentControls";
import { TuningFamilyTabs, TuningSelect, NotationToggle } from "./TuningControls";
import { CustomTuningEditor } from "./CustomTuningEditor";
import { TuningSummary } from "./TuningSummary";
import { Fretboard } from "./Fretboard";

/**
 * Tuning Explorer's top-level client component (ONA app #2, product spec
 * §5). Opens ready-to-use (§4) — no wizard, no async data fetch: every
 * value it needs is already in `src/domain/tuningExplorer`'s static
 * preset library. State lives entirely in `tuningExplorerReducer`; this
 * component's own job is wiring that state to the controls/fretboard and
 * to `src/audio/tuningExplorerPlayer.ts` for actual sound.
 */
export function TuningExplorerApp() {
  const t = useTranslations("tuningExplorer");
  const [state, dispatch] = useReducer(tuningExplorerReducer, undefined, initialTuningExplorerState);
  const [isPlayingOpenStrings, setIsPlayingOpenStrings] = useState(false);
  const [activeOpenStringIndexes, setActiveOpenStringIndexes] = useState<ReadonlySet<number>>(new Set());
  const [audioError, setAudioError] = useState(false);

  const openStringsMidi = currentOpenStringsMidi(state);
  const maxFret = INSTRUMENT_CONFIGS[state.instrument].maxFret;

  async function handlePlayNote(_stringIndex: number, _fret: number, midi: number) {
    try {
      await playNote(state.instrument, midi);
    } catch (error) {
      if (error instanceof TuningExplorerAudioInitError) setAudioError(true);
    }
  }

  async function handlePlayOpenStrings() {
    setAudioError(false);
    setIsPlayingOpenStrings(true);
    try {
      await playOpenStrings(state.instrument, openStringsMidi, (stringIndex) => {
        setActiveOpenStringIndexes((previous) => new Set(previous).add(stringIndex));
        setTimeout(() => {
          setActiveOpenStringIndexes((previous) => {
            const next = new Set(previous);
            next.delete(stringIndex);
            return next;
          });
        }, 1000);
      });
    } catch (error) {
      if (error instanceof TuningExplorerAudioInitError) setAudioError(true);
    } finally {
      const totalMs = (openStringsMidi.length - 1) * 280 + 1000;
      setTimeout(() => setIsPlayingOpenStrings(false), totalMs);
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b border-border px-4 py-3 sm:px-6">
        <InstrumentPills
          value={state.instrument}
          onChange={(instrument) => dispatch({ type: "SET_INSTRUMENT", instrument })}
        />
        <StringCountPills
          instrument={state.instrument}
          value={state.stringCount}
          onChange={(stringCount) => dispatch({ type: "SET_STRING_COUNT", stringCount })}
        />
        <TuningFamilyTabs
          instrument={state.instrument}
          stringCount={state.stringCount}
          value={state.family}
          onChange={(family) => dispatch({ type: "SET_FAMILY", family })}
        />
        <TuningSelect
          instrument={state.instrument}
          stringCount={state.stringCount}
          family={state.family}
          presetId={state.presetId}
          onChange={(presetId) => dispatch({ type: "SET_PRESET", presetId })}
        />
        <NotationToggle
          value={state.notation}
          onChange={(notation) => dispatch({ type: "SET_NOTATION", notation })}
        />
      </div>

      {state.family === "custom" && (
        <div className="border-b border-border px-4 py-3 sm:px-6">
          <CustomTuningEditor
            openStringsMidi={openStringsMidi}
            notation={state.notation}
            onChangeString={(stringIndex, pitchClass) =>
              dispatch({ type: "SET_CUSTOM_STRING", stringIndex, pitchClass })
            }
            onReset={() => dispatch({ type: "RESET_TO_STANDARD" })}
          />
        </div>
      )}

      {audioError && (
        <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-raised px-4 py-2 text-sm text-foreground-muted sm:px-6">
          <span>{t("audioError")}</span>
          <button
            type="button"
            onClick={() => setAudioError(false)}
            className="shrink-0 text-xs font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      <TuningSummary
        presetName={currentPresetName(state)}
        instrument={state.instrument}
        stringCount={state.stringCount}
        openStringsMidi={openStringsMidi}
        notation={state.notation}
        onPlayOpenStrings={handlePlayOpenStrings}
        isPlaying={isPlayingOpenStrings}
      />

      <div className="flex flex-1 items-start justify-center overflow-hidden p-4 sm:p-6">
        <Fretboard
          openStringsMidi={openStringsMidi}
          maxFret={maxFret}
          notation={state.notation}
          onPlayNote={handlePlayNote}
          externalHighlightStringIndexes={activeOpenStringIndexes}
        />
      </div>
    </div>
  );
}
