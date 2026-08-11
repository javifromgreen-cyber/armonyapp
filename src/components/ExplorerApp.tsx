"use client";

import { useEffect, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { parseChordSymbol, type Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import type { ZoomLevel } from "@/domain/harmony";
import { HarmonicMap } from "./map/HarmonicMap";
import { explorerReducer, initialExplorerState } from "./map/explorerState";
import { ChordContextPanel } from "./chordPanel/ChordContextPanel";
import { ZoomControl } from "./controls/ZoomControl";
import { KeySelector } from "./controls/KeySelector";

const DEFAULT_CONTEXT: Key = { tonic: { letter: "C", accidental: 0 }, mode: "major" };
const DEFAULT_CHORD: Chord = parseChordSymbol("Cmaj7");

export function ExplorerApp() {
  const [state, dispatch] = useReducer(
    explorerReducer,
    undefined,
    () => initialExplorerState(DEFAULT_CONTEXT, DEFAULT_CHORD),
  );
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isPanelOpenOnMobile, setIsPanelOpenOnMobile] = useState(false);

  function handleSelect(chord: Chord) {
    dispatch({ type: "SELECT", chord });
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
      return;
    }
    setIsFreeMode(false);
    dispatch({ type: "SET_CONTEXT", context });
  }

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row">
      <div className="flex flex-1 flex-col">
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

      {!isFreeMode && (
        <MobilePanelShell isOpen={isPanelOpenOnMobile} onToggle={setIsPanelOpenOnMobile}>
          <ChordContextPanel
            chord={state.selectedChord}
            sourceChord={state.exploredChord}
            context={state.context}
            zoom={state.zoom}
            onExploreFrom={handleExplore}
          />
        </MobilePanelShell>
      )}
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
 * Desktop: a static right-hand sidebar. Below `lg`, the same panel becomes a
 * bottom sheet — full content when open, a tappable "peek" bar when closed —
 * rather than the desktop layout simply shrunk (product-spec.md §11/§13).
 */
function MobilePanelShell({
  isOpen,
  onToggle,
  children,
}: {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("app.map");

  // Keep the panel expanded on desktop regardless of the mobile open state.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) onToggle(true);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onToggle]);

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-10 max-h-[75vh] rounded-t-2xl border-t border-border bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out",
        "lg:static lg:z-auto lg:h-full lg:w-[380px] lg:max-h-none lg:translate-y-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none",
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-52px)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="flex w-full items-center justify-center gap-2 py-3 text-sm text-foreground-muted lg:hidden"
        aria-expanded={isOpen}
      >
        <span className="h-1 w-8 rounded-full bg-border" aria-hidden />
        <span className="sr-only">{isOpen ? "" : t("selectHint")}</span>
      </button>
      <div className="h-full max-h-[calc(75vh-52px)] lg:max-h-full">{children}</div>
    </div>
  );
}
