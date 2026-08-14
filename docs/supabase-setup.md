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
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Supabase renamed this key from
     "anon" / "anon public" to "Publishable key" as part of their current API key system; some
     projects/dashboards may still show the older "anon public" label — it's the same low-privilege
     key, just an older name. Either way, this is the key that only ever acts as the authenticated
     user, entirely governed by RLS.
3. Put both in `.env.local` (copy `.env.example` first). **Do not** use
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the variable name — the app no longer reads it anywhere (see
   the hardening-pass note below). Do **not** set `SUPABASE_SERVICE_ROLE_KEY`/secret key either — no
   code in this phase uses it (trial-row creation runs entirely inside a database trigger, not
   application code); keep it unset here and never add it to a `NEXT_PUBLIC_*` variable if a later
   phase does need it.

> **Hardening-pass note:** an earlier version of this phase's code read
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which briefly caused a "Missing ..." startup error in Production
> once the real project was wired up under the newer `PUBLISHABLE_KEY` naming. All Supabase client
> code (`src/platform/supabase/{env,client,server,middleware}.ts`) now reads exclusively
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` through one shared helper (`getSupabasePublicEnv()`), so
> there is a single place that can ever require this variable, and `ANON_KEY` has zero effect
> anywhere in the app (see `src/platform/supabase/env.test.ts`).

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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Also set `NEXT_PUBLIC_SITE_URL` to that environment's real origin — used when building the
`/auth/callback` redirect URL from the sign-in form. `SUPABASE_SERVICE_ROLE_KEY`/secret key is not
required by any of the above — do not set it unless a later phase (e.g. Stripe webhooks) explicitly
needs it, and never mark it `NEXT_PUBLIC_*`.

## Verified in Production (manual, real Supabase project)

The following has been manually confirmed against the real, deployed Supabase project — not just
unit-tested — and this pass did not touch any of it:

- Passwordless email sign-in: real magic-link email delivered and completes the round trip back
  through `/auth/callback` to the originating destination.
- Google OAuth sign-in: completes the real OAuth round trip through Google and Supabase back to the
  originating destination.
- Signing in with Google and signing in with the same email address via the passwordless flow
  resolve to **one** Supabase user, showing both linked providers (Email + Google) on that account
  — see §6 above for why this is governed by Supabase project settings, not application code.
- The 72-hour trial row is created automatically on first account creation.
- Signing out and back in does **not** reset or duplicate the trial (confirmed for both the
  original provider and for signing in with the second, newly-linked provider).
- Armony (`/app`) opens correctly for an authenticated user with an active trial.
- The Account page displays the real authenticated email and the real trial end time.

**Not yet manually verified in Production:** the expired-trial path (Account showing "Trial ended",
`/app` redirecting to Trial Ended, re-authentication not reviving the trial). §8 below is a safe,
non-invasive procedure for verifying it against the real project without adding any bypass to the
product itself; it has not been run as of this document's last update — do not claim it has.

## 8. Manual QA: verifying expired-trial behavior against the real project

There is deliberately **no** way for a normal visitor — or for this application's own code — to
simulate, extend, or shorten a trial. No query-string override, no hidden route, no environment
flag. The only supported way to verify the expired-trial UI/redirects against a real account is to
move a real, dedicated QA account's trial into the past directly in the database, using Supabase's
own SQL Editor (which runs with elevated privileges, bypassing RLS by design — this is
administrator access to your own project, not a capability this app exposes).

**Before running anything below:** create a real QA account through the app's normal sign-in flow
(e.g. `qa+trial-expiry@your-domain.example`) — never repurpose a real user's account for this.

1. **Verify you have the right user** (read-only — run this first, every time):

   ```sql
   select u.id, u.email, pa.trial_started_at, pa.trial_ends_at
   from auth.users u
   join public.platform_access pa on pa.user_id = u.id
   where u.email = 'qa+trial-expiry@your-domain.example';
   ```

   Confirm exactly one row, and that the email is unmistakably the dedicated QA account.

2. **Move only that user's trial into the past:**

   ```sql
   update public.platform_access
   set trial_ends_at = now() - interval '1 hour'
   where user_id = (
     select id from auth.users where email = 'qa+trial-expiry@your-domain.example'
   );
   ```

   This targets exactly one row, identified by the QA account's email, via the subquery — never a
   bare `update ... set trial_ends_at = ...` with no `where`, which would affect every user. Do not
   touch `trial_started_at`, the trigger, or RLS; nothing else changes.

3. **Manually verify, signed in as the QA account:**
   1. Sign in as the QA account — it should succeed normally.
   2. Visit Account — it should report the expired state (`Trial ended` / `Prueba finalizada`),
      still showing the real QA email.
   3. Visit `/app` directly — it should redirect to Trial Ended, never render Armony.
   4. Sign out and sign back in as the same QA account — it should remain expired (confirms
      re-authentication does not revive or reset an expired trial).

4. **Clean up afterward** — restore the QA account to a normal trialing state (or leave it expired
   permanently and just stop using that account; do not leave ambiguous test data lying around
   without a note of what it is):

   ```sql
   update public.platform_access
   set trial_ends_at = trial_started_at + interval '72 hours'
   where user_id = (
     select id from auth.users where email = 'qa+trial-expiry@your-domain.example'
   );
   ```

This procedure is documentation only — it is not, and must never become, a feature of the product
itself. No code in this repository can perform this update (RLS's `platform_access` policy is
`select`-only for the client, by design); it requires the project owner's own Supabase dashboard
access.

## What this repo cannot verify for you

The expired-trial path above requires the manual QA procedure in §8 and has not yet been run (see
"Verified in Production" above for what has). Separately, the following were never end-to-end
testable from the sandbox this code was originally built in, and while several are now confirmed
in Production (see above), it's worth keeping this list for anything not yet explicitly reverified:

- RLS actually blocking a client-side `update`/`insert`/`delete` against `platform_access` (the
  migration's policies were written to deny this by construction — no policy exists for those
  operations — but this should be confirmed against the live project, e.g. via the SQL Editor's
  "run as" role testing or a quick manual check from the browser console).

What *is* covered by automated tests without a live project: the pure trial-math, access-status,
and `/app` route-decision logic (`src/domain/entitlements/*.test.ts`), the `returnTo` allowlist
logic (`src/platform/safeReturnTo.test.ts`), and the Supabase env-config contract
(`src/platform/supabase/env.test.ts`) — plus `next build` succeeding and every Supabase-touching
code path failing safe (visitor treated as signed out) when these env vars are absent.
