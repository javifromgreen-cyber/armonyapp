import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

interface PendingCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Refreshes the Supabase session (rotating the access token via the refresh
 * token cookie when needed) for `src/proxy.ts`, without owning the actual
 * `NextResponse` — `src/proxy.ts` composes next-intl's routing response with
 * whatever cookies this returns, rather than the more common pattern of one
 * middleware owning the whole response. `getUser()` (not `getSession()`) is
 * called so this also revalidates the JWT with the auth server — the
 * well-established safe pattern for anything gatekeeping access, per
 * Supabase's own guidance that `getSession()` alone must never be trusted
 * server-side.
 *
 * Swallows any Supabase/env error and returns no cookies to set — e.g.
 * `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` not configured yet. This runs on
 * EVERY matched request; letting it throw would take down locale routing
 * (and therefore the whole site) whenever Supabase is unreachable, which is
 * strictly worse than visitors simply appearing signed out until it's
 * configured.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<PendingCookie[]> {
  try {
    const { url, anonKey } = getSupabasePublicEnv();
    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies.push(...cookiesToSet);
        },
      },
    });

    await supabase.auth.getUser();

    return pendingCookies;
  } catch (error) {
    console.error("refreshSupabaseSession failed; proceeding without a session refresh.", error);
    return [];
  }
}
