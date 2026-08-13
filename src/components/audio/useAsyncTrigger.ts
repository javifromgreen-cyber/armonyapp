"use client";

import { useCallback, useState } from "react";

/**
 * Wraps an async action (Phase R2 §22's "tasteful loading state") with a
 * simple pending flag — each instrument panel's "Hear this voicing/pattern"
 * button uses this so its label/disabled-state reflects whether that
 * instrument's sample set is still loading. Only meaningfully slow the
 * first time a given instrument is heard in a session (`player.ts` caches
 * loaded samples after that), so the flag flips back to `false` almost
 * immediately on every later use.
 */
export function useAsyncTrigger<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
): { run: (...args: Args) => void; isPending: boolean } {
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    (...args: Args) => {
      setIsPending(true);
      action(...args).finally(() => setIsPending(false));
    },
    [action],
  );

  return { run, isPending };
}
