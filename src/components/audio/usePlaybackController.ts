"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hearChord as hearChordAudio,
  playProgression as playProgressionAudio,
  stopProgression as stopProgressionAudio,
  AudioInitError,
} from "@/audio/player";
import type { Chord } from "@/domain/chords";
import type { Progression } from "@/domain/progression";

export type AudioErrorKind = "init";

export interface PlaybackController {
  isPlaying: boolean;
  /** The progression item currently sounding, for card highlighting (Phase 6 §7) — null when stopped. */
  playingItemId: string | null;
  error: AudioErrorKind | null;
  hearChord: (chord: Chord) => void;
  playProgression: (progression: Progression) => void;
  stop: () => void;
  dismissError: () => void;
}

/**
 * The React-facing seam onto `src/audio/player.ts` — owns only UI state
 * (is anything playing, which card to highlight, a translatable error
 * kind), never musical/scheduling logic. "Hear chord" and "Play
 * progression" are kept as genuinely separate actions here too (Phase 6
 * §12): hearing a chord never touches `isPlaying`/`playingItemId`.
 */
export function usePlaybackController(): PlaybackController {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [error, setError] = useState<AudioErrorKind | null>(null);

  const stop = useCallback(() => {
    stopProgressionAudio();
    setIsPlaying(false);
    setPlayingItemId(null);
  }, []);

  // Stop cleanly on unmount so navigating away never leaves hanging notes
  // or a running transport behind (Phase 6 §8).
  useEffect(() => stop, [stop]);

  const hearChord = useCallback((chord: Chord) => {
    hearChordAudio(chord).catch((cause: unknown) => {
      if (cause instanceof AudioInitError) setError("init");
    });
  }, []);

  const playProgression = useCallback((progression: Progression) => {
    if (progression.items.length === 0) return; // defense in depth — the Play control is disabled for this case already
    setError(null);
    playProgressionAudio(progression, {
      onChordStart: setPlayingItemId,
      onFinish: () => {
        setIsPlaying(false);
        setPlayingItemId(null);
      },
    })
      .then(() => setIsPlaying(true))
      .catch((cause: unknown) => {
        if (cause instanceof AudioInitError) setError("init");
      });
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return { isPlaying, playingItemId, error, hearChord, playProgression, stop, dismissError };
}
