"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hearChord as hearChordAudio,
  hearPitches as hearPitchesAudio,
  hearPath as hearPathAudio,
  playProgression as playProgressionAudio,
  stopProgression as stopProgressionAudio,
  AudioInitError,
  type HearPitchesOptions,
} from "@/audio/player";
import type { Chord } from "@/domain/chords";
import type { Progression } from "@/domain/progression";
import type { PlayablePitch } from "@/domain/instruments";

export type AudioErrorKind = "init";

export interface PlaybackController {
  isPlaying: boolean;
  /** The progression item currently sounding, for card highlighting (Phase 6 §7) — null when stopped. */
  playingItemId: string | null;
  error: AudioErrorKind | null;
  hearChord: (chord: Chord) => void;
  /**
   * Plays an exact set of pitches (Phase 7 §13 / Phase 8 §19's "Hear this
   * voicing" / Phase 9 §23's "Hear this pattern") — never a regenerated
   * generic chord. `options.strumDelaySeconds` staggers onsets; `options.voice`
   * selects a real instrument sample set (Phase R2). Returns a promise that
   * always resolves (errors are already routed to `error` above) so callers
   * can show a brief loading state while that instrument's samples load —
   * only meaningful the first time a given instrument is heard this session.
   */
  hearVoicing: (pitches: PlayablePitch[], options?: HearPitchesOptions) => Promise<void>;
  /**
   * Plays the cumulative exploration audition — the confirmed path, plus a
   * previewed candidate while one is active — from its first chord every
   * time (Phase R3.2 §14/§18/§21). The single audio primitive that drives
   * previewing a candidate, Back's shortened-path replay, and the
   * current-chord's own replay; callers just pass the right chord list.
   */
  hearPath: (chords: Chord[]) => Promise<void>;
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

  const hearVoicing = useCallback((pitches: PlayablePitch[], options?: HearPitchesOptions) => {
    return hearPitchesAudio(pitches, options).catch((cause: unknown) => {
      if (cause instanceof AudioInitError) setError("init");
    });
  }, []);

  // hearPath cancels any in-flight Transport-scheduled audio at the audio
  // layer (player.ts's hearPath calls stopProgression() first) — if that
  // preempted an actual "Play progression" run, this keeps the Play/Stop
  // UI honest rather than showing "playing" over silence.
  const hearPath = useCallback((chords: Chord[]) => {
    setIsPlaying(false);
    setPlayingItemId(null);
    return hearPathAudio(chords).catch((cause: unknown) => {
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

  return {
    isPlaying,
    playingItemId,
    error,
    hearChord,
    hearVoicing,
    hearPath,
    playProgression,
    stop,
    dismissError,
  };
}
