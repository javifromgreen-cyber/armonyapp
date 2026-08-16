import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/**
 * The ONLY Supabase client in this app allowed to bypass RLS (ONA
 * Functional Phase 2) — used exclusively by trusted server-side billing
 * code (the Stripe checkout route and webhook handler) to write
 * `public.platform_billing`, since RLS deliberately grants the
 * authenticated client `select` only on that table (see
 * `supabase/migrations/`). Built directly with `@supabase/supabase-js`'s
 * plain `createClient` — deliberately NOT `@supabase/ssr`'s cookie-aware
 * client (`../supabase/server.ts`): this client is never tied to a visitor's
 * session, has no cookies to read or write, and must never accidentally
 * pick up a request's session context. `persistSession`/`autoRefreshToken`
 * are both disabled for the same reason — there is no session to persist or
 * refresh; every call authenticates as the service role via
 * `SUPABASE_SECRET_KEY` alone. `import "server-only"` turns an accidental
 * client-bundle import into a build-time error, since this key must never
 * reach the browser.
 */
function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. See docs/stripe-billing-setup.md for how to configure it.",
    );
  }
  return key;
}

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { url } = getSupabasePublicEnv();
    adminClient = createClient(url, getSupabaseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
