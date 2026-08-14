# Supabase setup (ONA Functional Phase 1)

This covers the external setup needed to make real authentication, the 72-hour trial, and `/app`
protection work. None of this is automated — it happens once, by hand, in the Supabase dashboard
(and, for Google sign-in, the Google Cloud Console). Nothing in this repo can create the Supabase
project or configure the OAuth provider for you.

See `docs/architecture.md`'s "Entitlements"/"Data model" sections for the code-level design this
setup supports, and `CLAUDE.md`'s commercial-model rules for the product rationale.

## 1. Create (or select) the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one for this app).
2. From **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Put both in `.env.local` (copy `.env.example` first). Do **not** set `SUPABASE_SERVICE_ROLE_KEY`
   — no code in this phase uses it (trial-row creation runs entirely inside a database trigger, not
   application code); keep it unset here and never add it to a `NEXT_PUBLIC_*` variable if a later
   phase does need it.

## 2. Apply the migration

The schema lives at `supabase/migrations/20260814120000_platform_access.sql`. It creates:

- `public.platform_access` — one row per user (`user_id` PK, `trial_started_at`, `trial_ends_at`,
  `created_at`), with RLS enabled and only a `select` policy (`auth.uid() = user_id`) — the client
  can read its own row and can never write or reset the trial timestamps.
- `handle_new_platform_user()` — a `SECURITY DEFINER` function (with an explicit
  `set search_path = public, pg_temp`, to avoid search-path-hijacking) that inserts a
  `platform_access` row with `trial_ends_at = now() + interval '72 hours'`.
- `on_auth_user_created` — a trigger firing `handle_new_platform_user()` `AFTER INSERT ON
  auth.users`, so the trial starts atomically with account creation, exactly once, with no
  application code involved.

Apply it via the Supabase CLI (`supabase db push`, or `supabase migration up` against a linked
project) or by pasting the file's contents into the dashboard's SQL Editor. Either way, confirm
afterward (SQL Editor):

```sql
select trigger_name from information_schema.triggers where event_object_table = 'users';
-- expect: on_auth_user_created

select tablename, rowsecurity from pg_tables where tablename = 'platform_access';
-- expect: rowsecurity = true
```

## 3. Configure Google OAuth

In the Supabase dashboard, **Authentication → Providers → Google**:

1. Enable the Google provider.
2. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID
   (Web application) and add Supabase's callback URL as an **Authorized redirect URI** — Supabase
   shows the exact URL to use on the same provider settings page
   (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. Paste the resulting **Client ID** and **Client Secret** into Supabase's Google provider settings
   and save.

This app never talks to Google directly — `SignInActions` calls
`supabase.auth.signInWithOAuth({ provider: "google" })`, and Supabase handles the OAuth exchange.

## 4. Configure passwordless email

In **Authentication → Providers → Email**:

- Keep "Confirm email" behavior as Supabase's default for OTP/magic-link sign-in (no password is
  ever collected or stored by this app).
- This app calls `supabase.auth.signInWithOtp({ email })` — no separate "email/password" flow
  exists or is planned; see `docs/roadmap.md`'s ONA Functional Phase 1 deviations entry for why
  password-based auth was dropped from the original Phase 10A sketch.

## 5. Site URL and redirect URLs

In **Authentication → URL Configuration**:

- **Site URL**: your production URL (e.g. `https://your-domain.example`) for production, or
  `http://localhost:3000` while developing locally.
- **Redirect URLs** (allow-list, one per environment you use): add the `/auth/callback` path for
  every origin that needs to complete a sign-in —
  - `http://localhost:3000/auth/callback` (local dev)
  - `https://<your-vercel-preview-domain>/auth/callback` (if using Vercel preview deployments —
    note preview URLs are typically per-deployment, so a wildcard or a stable preview alias may be
    needed depending on your Vercel setup)
  - `https://your-domain.example/auth/callback` (production)

Both the Google OAuth flow (`signInWithOAuth`'s `redirectTo`) and the passwordless email flow
(`signInWithOtp`'s `emailRedirectTo`) point at this same `/auth/callback` route
(`src/app/auth/callback/route.ts`), which exchanges the PKCE `code` for a session and then redirects
to the locale-aware, allowlist-validated `returnTo` destination (`src/platform/safeReturnTo.ts`).

## 6. Google + email identity linking

Whether signing in with Google and signing in with the same email address via the passwordless
flow resolve to the *same* account, or create two separate accounts, is governed entirely by your
Supabase project's **Authentication → Providers** settings (specifically automatic account linking
behavior) — not by any code in this repository. Verify the behavior you want directly in your own
project's dashboard/docs before relying on it; this document intentionally does not claim a
specific behavior here, since it depends on Supabase configuration this repo doesn't control.

## 7. Vercel (or other host) environment variables

Set the same two variables from step 1 in your hosting provider's environment variable settings for
every environment you deploy (Preview and Production, at minimum):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Also set `NEXT_PUBLIC_SITE_URL` to that environment's real origin — used when building the
`/auth/callback` redirect URL from the sign-in form.

## What this repo cannot verify for you

No real Supabase project exists in the environment this code was built in, so the following were
**not** end-to-end tested and must be verified manually against a real project before shipping:

- The Google OAuth round trip actually completing and landing back on `returnTo`.
- The passwordless email round trip actually completing (receiving the email, clicking the link,
  landing back on `returnTo`).
- The trigger firing and creating exactly one `platform_access` row per new `auth.users` row.
- RLS actually blocking a client-side `update`/`insert`/`delete` against `platform_access` (the
  migration's policies were written to deny this by construction — no policy exists for those
  operations — but this should be confirmed against the live project, e.g. via the SQL Editor's
  "run as" role testing or a quick manual check from the browser console).
- Google + email identity-linking behavior (see §6 above).

What *is* covered without a live project: the pure trial-math and access-status logic
(`src/domain/entitlements/*.test.ts`) and the `returnTo` allowlist logic
(`src/platform/safeReturnTo.test.ts`), plus `next build` succeeding and every Supabase-touching
code path failing safe (visitor treated as signed out) when these env vars are absent.
