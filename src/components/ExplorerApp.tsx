"use client";

import { useReducer, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { parseChordSymbol, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import type { ZoomLevel } from "@/domain/harmony";
import { createProgressionItem, type TimeSignature } from "@/domain/progression";
import { HarmonicMap } from "./map/HarmonicMap";
import { explorerReducer, initialExplorerState } from "./map/explorerState";
import { ChordContextPanel } from "./chordPanel/ChordContextPanel";
import { ZoomControl } from "./controls/ZoomControl";
import { KeySelector } from "./controls/KeySelector";
import { ProgressionEditor } from "./progression/ProgressionEditor";
import {
  progressionReducer,
  initialProgressionState,
  type ProgressionAction,
} from "./progression/progressionReducer";
import { usePlaybackController } from "./audio/usePlaybackController";
import type { Instrument } from "./chordPanel/instrument";

const DEFAULT_CONTEXT: Key = { tonic: { letter: "C", accidental: 0 }, mode: "major" };
const DEFAULT_CHORD: Chord = parseChordSymbol("Cmaj7");
const DESKTOP_BREAKPOINT_QUERY = "(min-width: 1024px)";

type MobileTab = "chord" | "progression";

/**
 * Desktop and mobile use genuinely different DOM placements for the
 * progression editor (full-width strip under the map vs. a tab inside the
 * mobile bottom sheet) — not just different styling of the same slot — so
 * they can't share one always-mounted element toggled by CSS alone without
 * mounting `ProgressionEditor` twice at once (two live components editing
 * the same shared state redundantly). Tracking the breakpoint in JS lets
 * the parent mount exactly one of the two layouts at a time.
 */
function subscribeToDesktopBreakpoint(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getIsDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;
}

/** Server has no viewport — default to the mobile layout until the client hydrates and reads the real one. */
function getIsDesktopServerSnapshot(): boolean {
  return false;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getIsDesktopSnapshot,
    getIsDesktopServerSnapshot,
  );
}

export function ExplorerApp() {
  const [state, dispatch] = useReducer(
    explorerReducer,
    undefined,
    () => initialExplorerState(DEFAULT_CONTEXT, DEFAULT_CHORD),
  );
  const [progression, progressionDispatch] = useReducer(
    progressionReducer,
    undefined,
    initialProgressionState,
  );
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isPanelOpenOnMobile, setIsPanelOpenOnMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chord");
  const [activeInstrument, setActiveInstrument] = useState<Instrument>("piano");
  const isDesktop = useIsDesktop();
  const playback = usePlaybackController();

  // Any progression edit while playing invalidates what's currently
  // sounding (Phase 6 §8/§9) — stopping is the simplest reliable choice the
  // brief explicitly allows, applied uniformly through this single wrapper
  // rather than repeated in every handler below.
  function dispatchProgression(action: ProgressionAction) {
    if (playback.isPlaying) playback.stop();
    progressionDispatch(action);
  }

  function handleSelect(chord: Chord) {
    dispatch({ type: "SELECT", chord });
    setMobileTab("chord");
    setIsPanelOpenOnMobile(true);
  }

  function handleExplore(chord: Chord) {
    dispatch({ type: "EXPLORE", chord });
  }

  function handleZoomChange(zoom: ZoomLevel) {
    dispatch({ type: "SET_ZOOM", zoom });
  }

  function handleKeyChange(context: Key | null) {
    if (context === null) {
      setIsFreeMode(true);
      setMobileTab("progression");
      return;
    }
    setIsFreeMode(false);
    dispatch({ type: "SET_CONTEXT", context });
  }

  // Explicit "Add to progression" action (product-spec.md Phase 5 §2/§5):
  // uses the panel's chord (the SELECTED chord, not necessarily the
  // explored/central one) — never triggered by SELECT or EXPLORE, which
  // dispatch to `explorerReducer` only. Progression state lives in its own
  // reducer, so there is no code path from selecting/exploring a chord to
  // mutating the progression.
  function handleAddToProgression(chord: Chord) {
    dispatchProgression({ type: "ADD", item: createProgressionItem(chord) });
  }

  function handleRemoveFromProgression(id: string) {
    dispatchProgression({ type: "REMOVE", id });
  }

  function handleReorderProgression(fromIndex: number, toIndex: number) {
    dispatchProgression({ type: "REORDER", fromIndex, toIndex });
  }

  function handleSetDuration(id: string, durationBeats: number) {
    dispatchProgression({ type: "SET_DURATION", id, durationBeats });
  }

  function handleSetBpm(bpm: number) {
    dispatchProgression({ type: "SET_BPM", bpm });
  }

  function handleSetTimeSignature(timeSignature: TimeSignature) {
    dispatchProgression({ type: "SET_TIME_SIGNATURE", timeSignature });
  }

  function handleClearProgression() {
    dispatchProgression({ type: "CLEAR" });
  }

  function handleTransposeProgression(semitones: number) {
    dispatchProgression({ type: "TRANSPOSE", semitones });
  }

  const chordPanel = !isFreeMode && (
    <ChordContextPanel
      chord={state.selectedChord}
      sourceChord={state.exploredChord}
      context={state.context}
      zoom={state.zoom}
      isDesktop={isDesktop}
      activeInstrument={activeInstrument}
      onInstrumentChange={setActiveInstrument}
      onExploreFrom={handleExplore}
      onAddToProgression={handleAddToProgression}
      onHearChord={playback.hearChord}
      onHearPitches={playback.hearVoicing}
    />
  );

  const progressionEditor = (
    <ProgressionEditor
      progression={progression}
      onRemove={handleRemoveFromProgression}
      onReorder={handleReorderProgression}
      onSetDuration={handleSetDuration}
      onSetBpm={handleSetBpm}
      onSetTimeSignature={handleSetTimeSignature}
      onClear={handleClearProgression}
      onTranspose={handleTransposeProgression}
      isPlaying={playback.isPlaying}
      playingItemId={playback.playingItemId}
      onPlay={() => playback.playProgression(progression)}
      onStop={playback.stop}
    />
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-end gap-4 border-b border-border px-4 py-3 sm:px-6">
            <KeySelector value={isFreeMode ? null : state.context} onChange={handleKeyChange} />
            <ZoomControl zoom={state.zoom} onChange={handleZoomChange} />
          </div>

          {playback.error && <AudioErrorBanner onDismiss={playback.dismissError} />}

          <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
            {isFreeMode ? (
              <FreeModeEmptyState />
            ) : (
              <HarmonicMap
                context={state.context}
                exploredChord={state.exploredChord}
                selectedChord={state.selectedChord}
                zoom={state.zoom}
                onSelect={handleSelect}
              />
            )}
          </div>
        </div>

        {isDesktop ? (
          <aside className="flex w-[380px] flex-col border-l border-border">{chordPanel}</aside>
        ) : (
          <MobileBottomSheet
            isOpen={isPanelOpenOnMobile}
            onToggle={setIsPanelOpenOnMobile}
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            progressionCount={progression.items.length}
            showChordTab={!isFreeMode}
          >
            {mobileTab === "chord" && chordPanel ? chordPanel : progressionEditor}
          </MobileBottomSheet>
        )}
      </div>

      {/* Desktop-only persistent progression strip, full width (product-spec.md §6) — on mobile the same editor lives in the tabbed bottom sheet above instead. */}
      {isDesktop && <div className="border-t border-border">{progressionEditor}</div>}
    </div>
  );
}

/** A concise, translated fallback when audio fails to start (Phase 6 §15) — never a raw Web Audio/Tone.js error. */
function AudioErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("app.audio");
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-raised px-4 py-2 text-sm text-foreground-muted sm:px-6">
      <span>{t("initError")}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}

function FreeModeEmptyState() {
  const t = useTranslations("app.freeMode");
  return (
    <div className="flex max-w-sm flex-col items-center gap-2 text-center">
      <h2 className="text-lg font-medium text-foreground">{t("title")}</h2>
      <p className="text-sm text-foreground-muted">{t("description")}</p>
    </div>
  );
}

/**
 * Mobile-only bottom sheet, shared by the chord panel AND the progression
 * editor via two tabs — never two competing stacked sheets (Phase 5 §12).
 * The tab row doubles as the peek/handle bar, so the progression's size is
 * visible even collapsed. Only rendered when `!isDesktop` (see
 * `ExplorerApp`), so this never mounts alongside the desktop sidebar/strip.
 */
function MobileBottomSheet({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  progressionCount,
  showChordTab,
  children,
}: {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  progressionCount: number;
  showChordTab: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("app.progression");

  function handleTabClick(tab: MobileTab) {
    if (activeTab === tab && isOpen) {
      onToggle(false);
    } else {
      onTabChange(tab);
      onToggle(true);
    }
  }

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-10 max-h-[75vh] rounded-t-2xl border-t border-border bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-48px)]",
      ].join(" ")}
    >
      <div className="flex" role="tablist">
        {showChordTab && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chord"}
            aria-expanded={isOpen && activeTab === "chord"}
            onClick={() => handleTabClick("chord")}
            className={[
              "flex-1 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              activeTab === "chord"
                ? "border-accent text-foreground"
                : "border-transparent text-foreground-muted",
            ].join(" ")}
          >
            {t("chordTab")}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "progression"}
          aria-expanded={isOpen && activeTab === "progression"}
          onClick={() => handleTabClick("progression")}
          className={[
            "flex-1 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
            activeTab === "progression"
              ? "border-accent text-foreground"
              : "border-transparent text-foreground-muted",
          ].join(" ")}
        >
          {t("progressionTab", { count: progressionCount })}
        </button>
      </div>

      <div className="h-full max-h-[calc(75vh-48px)] overflow-y-auto">{children}</div>
    </div>
  );
}
