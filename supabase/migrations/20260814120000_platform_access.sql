-- ONA Functional Phase 1: platform-wide 72-hour trial access.
--
-- Deliberately minimal — one row per auth user, no Stripe/billing columns
-- yet (see docs/architecture.md's Entitlements section for the fuller
-- future shape; this table is intentionally simpler for now, per this
-- phase's own scope boundary). `trialing` vs `expired` is DERIVED in
-- application code (`src/domain/entitlements`) by comparing `trial_ends_at`
-- against the server clock — never stored as a status column here, so it
-- can never drift out of sync with the timestamps.

create table public.platform_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint trial_ends_after_start check (trial_ends_at > trial_started_at)
);

comment on table public.platform_access is
  'One row per ONA account. trial_started_at/trial_ends_at are set exactly once, by '
  'handle_new_platform_user() below, and are never writable by the authenticated client '
  '(no insert/update/delete RLS policy exists for the authenticated role — see below).';

-- Row Level Security: a user may read only their own row. No insert/update/
-- delete policy is created for any client-facing role, which — combined
-- with RLS being enabled — means the Postgres default applies: zero rows
-- are affected by those commands for `authenticated`/`anon`, regardless of
-- any table-level GRANT. The explicit revoke/grant below is defense in
-- depth on top of that, not a substitute for it.
alter table public.platform_access enable row level security;

revoke all on public.platform_access from anon, authenticated;
grant select on public.platform_access to authenticated;

create policy "Users can view their own platform access"
  on public.platform_access
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Trial creation lives at the database layer, not application code: a
-- SECURITY DEFINER trigger function fires once per newly-created
-- auth.users row and starts the 72-hour trial atomically with account
-- creation. This is what makes "sign out and sign back in never restarts
-- the trial" true by construction — there is no application code path that
-- creates or resets this row at all, only this trigger, and it only ever
-- fires on genuine first-time user creation.
--
-- `set search_path = public, pg_temp` on a SECURITY DEFINER function is
-- required hardening: without an explicit search_path, a SECURITY DEFINER
-- function resolves unqualified identifiers using the CALLER's search_path,
-- which is a well-known privilege-escalation vector (a caller could define
-- a same-named object earlier in their own search_path to hijack what the
-- function actually executes).
create function public.handle_new_platform_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.platform_access (user_id, trial_started_at, trial_ends_at)
  values (new.id, now(), now() + interval '72 hours')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_platform_user() is
  'Starts the 72-hour ONA platform trial exactly once, at genuine first account creation. '
  'SECURITY DEFINER with an explicit search_path — see the comment above this migration''s '
  'trigger creation for why. Never called from application code; only ever fires via the '
  'on_auth_user_created trigger on auth.users.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_platform_user();
