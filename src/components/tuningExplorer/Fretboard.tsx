"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { noteForPitchClass, noteName, type Notation } from "@/domain/notes";
import { generateFretboard, NOTE_DURATION_SECONDS } from "@/domain/tuningExplorer";

const SINGLE_MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_MARKER_FRETS = new Set([12, 24]);

const OPEN_COLUMN_WIDTH = 64;
const FRET_COLUMN_WIDTH = 56;
const ROW_HEIGHT = 44;
const MIN_STRING_THICKNESS_PX = 1.5;
const MAX_STRING_THICKNESS_PX = 4;

function highlightKey(stringIndex: number, fret: number): string {
  return `${stringIndex}:${fret}`;
}

/**
 * The interactive fretboard itself (product spec §11-16) — horizontal, nut
 * on the left, frets increasing rightward, string rows ordered
 * HIGH-to-LOW top-to-bottom like tablature (the OPPOSITE of
 * `openStringsMidi`'s own low-to-high storage order — this component is
 * the one place that reversal happens for rendering; the underlying data
 * never changes order). `generateFretboard` (framework-free) computes
 * every position's pitch; this component only ever adds display spelling
 * (`notation`) and interaction/highlight state on top.
 *
 * Fret markers (product spec §14) are rendered as their own thin ruler
 * strip below the strings rather than layered behind any specific string's
 * note label — a deliberate, simple way to guarantee they can never overlap
 * a note label (an explicit requirement), while staying visually part of
 * the same dark fretboard surface.
 */
export function Fretboard({
  openStringsMidi,
  maxFret,
  notation,
  onPlayNote,
  externalHighlightStringIndexes,
}: {
  /** Low string -> high string. */
  openStringsMidi: readonly number[];
  maxFret: number;
  notation: Notation;
  onPlayNote: (stringIndex: number, fret: number, midi: number) => void;
  /** Fret-0 positions currently lit by "Play open strings" (owned by the parent, since that sequence's timing lives there) — see this module's docstring. */
  externalHighlightStringIndexes?: ReadonlySet<number>;
}) {
  const t = useTranslations("tuningExplorer.fretboard");
  const board = useMemo(() => generateFretboard(openStringsMidi, maxFret), [openStringsMidi, maxFret]);
  const stringCount = openStringsMidi.length;

  // Manual click highlights (product spec §15): each position's highlight
  // is independent — overlapping clicks may each stay lit while their
  // sounds overlap, and retriggering the SAME position restarts its own
  // window cleanly without touching any other position's timer.
  const [clickedKeys, setClickedKeys] = useState<ReadonlySet<string>>(new Set());
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const id of timeouts.values()) clearTimeout(id);
      timeouts.clear();
    };
  }, []);

  function handleClick(stringIndex: number, fret: number, midi: number) {
    onPlayNote(stringIndex, fret, midi);

    const key = highlightKey(stringIndex, fret);
    const existingTimeout = timeoutsRef.current.get(key);
    if (existingTimeout) clearTimeout(existingTimeout);

    setClickedKeys((previous) => new Set(previous).add(key));
    const timeoutId = setTimeout(() => {
      setClickedKeys((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
      timeoutsRef.current.delete(key);
    }, NOTE_DURATION_SECONDS * 1000);
    timeoutsRef.current.set(key, timeoutId);
  }

  // Rendered top -> bottom = highest string -> lowest string.
  const visualStringIndexes = [...Array(stringCount).keys()].reverse();

  const gridTemplateColumns = `${OPEN_COLUMN_WIDTH}px ${Array(maxFret).fill(`${FRET_COLUMN_WIDTH}px`).join(" ")}`;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-[#15100d]">
      <div style={{ minWidth: OPEN_COLUMN_WIDTH + maxFret * FRET_COLUMN_WIDTH }}>
        <div role="grid" aria-label={t("gridLabel")} className="relative">
          {visualStringIndexes.map((stringIndex, visualRow) => {
            const thickness =
              MIN_STRING_THICKNESS_PX +
              (visualRow / Math.max(stringCount - 1, 1)) * (MAX_STRING_THICKNESS_PX - MIN_STRING_THICKNESS_PX);
            return (
              <div
                key={stringIndex}
                role="row"
                className="relative flex items-center border-b border-white/5 last:border-b-0"
                style={{ height: ROW_HEIGHT, gridTemplateColumns, display: "grid" }}
              >
                {/* The string itself — a thin metallic line spanning the full row, behind the note markers. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-white/25 via-white/50 to-white/25"
                  style={{ height: thickness }}
                />

                {board[stringIndex].map((position) => {
                  const isOpen = position.fret === 0;
                  const isHighlighted =
                    clickedKeys.has(highlightKey(stringIndex, position.fret)) ||
                    (isOpen && externalHighlightStringIndexes?.has(stringIndex));
                  return (
                    <button
                      key={position.fret}
                      type="button"
                      role="gridcell"
                      onClick={() => handleClick(stringIndex, position.fret, position.midi)}
                      aria-label={t("noteAt", {
                        note: noteName(noteForPitchClass(position.pitchClass, notation)),
                        string: stringCount - stringIndex,
                        fret: position.fret,
                      })}
                      className={[
                        "relative z-10 flex items-center justify-center outline-none",
                        isOpen ? "border-r-[3px] border-r-white/30" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors duration-300",
                          isHighlighted
                            ? "bg-accent text-accent-foreground shadow-[0_0_0_3px_var(--color-accent)]"
                            : isOpen
                              ? "bg-white/15 text-white/80"
                              : "bg-white/8 text-white/60",
                        ].join(" ")}
                      >
                        {noteName(noteForPitchClass(position.pitchClass, notation))}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Fret marker ruler — deliberately separate from the string rows so a marker can never overlap a note label (product spec §14). */}
        <div className="flex h-5 items-center" style={{ gridTemplateColumns, display: "grid" }} aria-hidden="true">
          <div />
          {Array.from({ length: maxFret }, (_, i) => i + 1).map((fret) => (
            <div key={fret} className="flex items-center justify-center gap-1">
              {DOUBLE_MARKER_FRETS.has(fret) ? (
                <>
                  <Dot />
                  <Dot />
                </>
              ) : SINGLE_MARKER_FRETS.has(fret) ? (
                <Dot />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-white/25" />;
}
