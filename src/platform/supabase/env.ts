/**
 * The two PUBLIC Supabase values every client (browser and server) needs.
 * Both are safe to ship to the browser by design — the anon key only ever
 * grants what RLS policies allow (see `supabase/migrations/`), never a
 * privileged bypass. Centralized here so a missing `.env` fails loudly and
 * in one place, rather than as a cryptic Supabase client error deep in a
 * request.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to " +
        ".env.local and fill in your Supabase project's values (see docs/supabase-setup.md).",
    );
  }

  return { url, anonKey };
}
