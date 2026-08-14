import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

/**
 * A Supabase client for Server Components, Route Handlers, and Server
 * Actions — always a NEW client per call (never module-level/shared; each
 * request has its own cookie jar). Reads `next/headers`' cookies directly.
 *
 * `setAll` is wrapped in try/catch because Server Components are read-only
 * with respect to cookies (only Route Handlers, Server Actions, and
 * middleware may set them) — Supabase's own guidance is to swallow that
 * specific failure here, since `src/proxy.ts` already refreshes the session
 * cookie on every request before any Server Component runs. If that refresh
 * is ever removed, sessions will silently stop renewing — don't remove it.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — no-op; `src/proxy.ts` handles the refresh.
        }
      },
    },
  });
}
