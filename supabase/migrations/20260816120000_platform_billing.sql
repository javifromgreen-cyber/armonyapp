-- ONA Functional Phase 2: Stripe Pro subscriptions.
--
-- Deliberately a SEPARATE table from `public.platform_access` (the
-- one-time 72-hour trial, untouched by this migration) — billing state and
-- trial state have different lifecycles and different writers (the trial
-- row is written exactly once, by a database trigger; the billing row is
-- written repeatedly, by trusted server-side Stripe webhook/checkout code
-- using the Supabase "secret" key, which bypasses RLS entirely). Overall
-- Pro-vs-trial-vs-expired access is computed in application code
-- (`src/domain/entitlements`, `src/platform/access/getPlatformAccess.ts`),
-- never here.

create table public.platform_billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text check (plan in ('monthly', 'annual')),
  subscription_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_billing is
  'One row per ONA account that has ever started Stripe checkout. Written only by trusted '
  'server-side code (src/app/api/stripe/checkout, src/app/api/stripe/webhook) using the Supabase '
  'secret key, which bypasses RLS — the authenticated client has select-only access (see below). '
  '"plan" is derived server-side from the trusted configured Stripe Price IDs '
  '(src/domain/entitlements/billing.ts''s planFromPriceId), never inferred from a monetary amount '
  'or trusted from client input. subscription_status mirrors Stripe''s own Subscription.status '
  'values verbatim (active/trialing/past_due/canceled/incomplete/incomplete_expired/unpaid/paused) '
  '— see src/domain/entitlements/billing.ts''s hasProAccess for which statuses currently grant '
  'Pro access and why.';

-- Row Level Security: a user may read only their own row. No insert/update/
-- delete policy exists for any client-facing role — combined with RLS being
-- enabled, this means the Postgres default applies: zero rows are affected
-- by those commands for `authenticated`/`anon`, regardless of any
-- table-level GRANT. The explicit revoke/grant below is defense in depth on
-- top of that, matching supabase/migrations/20260814120000_platform_access.sql's
-- own pattern.
alter table public.platform_billing enable row level security;

revoke all on public.platform_billing from anon, authenticated;
grant select on public.platform_billing to authenticated;

create policy "Users can view their own billing state"
  on public.platform_billing
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Stripe webhook idempotency: records every successfully-processed Stripe
-- event ID so a retried/duplicated delivery is a harmless no-op (see
-- src/app/api/stripe/webhook/route.ts — an event ID is inserted here only
-- AFTER its billing-state synchronization has already succeeded, never
-- before, so a failed sync can still be retried by Stripe). No RLS
-- policies at all are created for any client-facing role — combined with
-- RLS being enabled, `anon`/`authenticated` can neither read nor write this
-- table under any circumstance; only the Supabase secret key (which
-- bypasses RLS) can touch it.
create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_created_at bigint,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Idempotency ledger for processed Stripe webhook events. No browser access whatsoever — '
  'written only by src/app/api/stripe/webhook using the Supabase secret key.';

alter table public.stripe_webhook_events enable row level security;

revoke all on public.stripe_webhook_events from anon, authenticated;
