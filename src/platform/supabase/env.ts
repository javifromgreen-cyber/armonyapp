/**
 * The two PUBLIC Supabase values every client (browser and server) needs —
 * the ONLY place in the app that reads them, so every Supabase client
 * (browser, server, middleware) fails the same way if either is missing,
 * instead of each module expecting a slightly different variable name.
 *
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is Supabase's current low-privilege
 * public key (what used to be called the "anon key" — some dashboards still
 * label it "anon public"; see `docs/supabase-setup.md`). Both values are
 * safe to ship to the browser by design — this key only ever grants what
 * RLS policies allow (see `supabase/migrations/`), never a privileged
 * bypass. Never read `SUPABASE_SERVICE_ROLE_KEY` (or any secret key) here —
 * that key must never reach client code and is not needed by ONA's
 * auth/trial architecture (trial-row creation runs entirely inside a
 * database trigger, not application code).
 */
export function getSupabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy " +
        ".env.example to .env.local and fill in your Supabase project's values (see " +
        "docs/supabase-setup.md).",
    );
  }

  return { url, publishableKey };
}
