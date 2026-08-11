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
import { progressionReducer, initialProgressionState } from "./progression/progressionReducer";

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
  const isDesktop = useIsDesktop();

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
    progressionDispatch({ type: "ADD", item: createProgressionItem(chord) });
  }

  function handleRemoveFromProgression(id: string) {
    progressionDispatch({ type: "REMOVE", id });
  }

  function handleReorderProgression(fromIndex: number, toIndex: number) {
    progressionDispatch({ type: "REORDER", fromIndex, toIndex });
  }

  function handleSetDuration(id: string, durationBeats: number) {
    progressionDispatch({ type: "SET_DURATION", id, durationBeats });
  }

  function handleSetBpm(bpm: number) {
    progressionDispatch({ type: "SET_BPM", bpm });
  }

  function handleSetTimeSignature(timeSignature: TimeSignature) {
    progressionDispatch({ type: "SET_TIME_SIGNATURE", timeSignature });
  }

  function handleClearProgression() {
    progressionDispatch({ type: "CLEAR" });
  }

  function handleTransposeProgression(semitones: number) {
    progressionDispatch({ type: "TRANSPOSE", semitones });
  }

  const chordPanel = !isFreeMode && (
    <ChordContextPanel
      chord={state.selectedChord}
      sourceChord={state.exploredChord}
      context={state.context}
      zoom={state.zoom}
      onExploreFrom={handleExplore}
      onAddToProgression={handleAddToProgression}
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
