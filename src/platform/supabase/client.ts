"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

/**
 * A single browser Supabase client, reused across the app (safe to share
 * client-side, unlike the server client) — used only by the sign-in form's
 * `signInWithOAuth`/`signInWithOtp` calls, which must run in the browser
 * since OAuth navigates the current window to the provider.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicEnv();
    browserClient = createBrowserClient(url, publishableKey);
  }
  return browserClient;
}
