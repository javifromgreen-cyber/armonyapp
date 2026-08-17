# Stripe billing setup (ONA Functional Phase 2)

This covers the manual, external setup needed to make real ONA Pro subscriptions work — Stripe
Checkout with Managed Payments, and the webhook that keeps `public.platform_billing` in sync.
Nothing here happens automatically; it's done once, by hand, in the Supabase and Stripe
dashboards. This is TEST/SANDBOX billing only — live mode is explicitly out of scope for this
phase (see `docs/roadmap.md`'s Phase 2 entry).

See `docs/architecture.md`'s "Entitlements"/"Data model" sections for the code-level design, and
`docs/supabase-setup.md` for the Phase 1 auth/trial setup this phase builds on top of.

## A. Supabase — apply the migration

The schema lives at `supabase/migrations/20260816120000_platform_billing.sql`. It creates:

- `public.platform_billing` — one row per account that has ever started checkout
  (`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan`,
  `subscription_status`, `current_period_end`, `cancel_at_period_end`). RLS: `select` only for
  `authenticated`, scoped to the caller's own row — no `insert`/`update`/`delete` policy exists for
  any client-facing role, so the browser can never write billing state. Only trusted server code
  (using `SUPABASE_SECRET_KEY`, which bypasses RLS) writes it.
- `public.stripe_webhook_events` — the webhook idempotency ledger. No RLS policies at all for any
  client-facing role — `anon`/`authenticated` have zero access, read or write.

Apply it the same way you applied the Phase 1 migration: via the Supabase CLI (`supabase db push`
or `supabase migration up`) or by pasting the file's contents into the dashboard's **SQL Editor**.
Confirm afterward:

```sql
select tablename, rowsecurity from pg_tables where tablename in ('platform_billing', 'stripe_webhook_events');
-- expect: rowsecurity = true for both

select policyname, cmd from pg_policies where tablename = 'platform_billing';
-- expect: exactly one row, cmd = 'SELECT'

select policyname from pg_policies where tablename = 'stripe_webhook_events';
-- expect: zero rows
```

The `platform_access` table (the 72-hour trial, from Phase 1) is untouched by this migration —
they're deliberately separate tables with separate writers.

### `SUPABASE_SECRET_KEY`

Copy your Supabase project's **secret key** (Project Settings → API — on older projects this may
still be labeled "service_role") into `SUPABASE_SECRET_KEY` in Vercel. It is read only by
`src/platform/supabase/admin.ts`, used only by the Stripe checkout route and webhook handler to
write `platform_billing`. **Never** prefix it `NEXT_PUBLIC_` and never let it near client code — it
bypasses Row Level Security entirely.

## B. Stripe — confirm Price IDs and Checkout Session behavior

Confirm in your Stripe TEST/SANDBOX dashboard:

- **Product**: "ONA Pro", with two recurring flat-rate Prices — Monthly (€7.99/month) and Annual
  (€59.99/year).
- Their Price IDs are already set in Vercel as `STRIPE_PRICE_ID_PRO_MONTHLY` and
  `STRIPE_PRICE_ID_PRO_ANNUAL`. The app never accepts a raw Price ID from the client — only a
  trusted `"monthly"`/`"annual"` plan identifier, resolved server-side
  (`src/platform/stripe/env.ts`'s `getStripePriceId`) to these two configured IDs.
- Managed Payments is explicitly enabled per-Checkout-Session by the app
  (`managed_payments: { enabled: true }` in `src/app/api/stripe/checkout/route.ts`) — there's
  nothing additional to toggle in the dashboard for this to take effect, but Managed Payments
  eligibility itself (digital products, supported markets) is governed by your Stripe account's
  own settings; if Checkout ever behaves unexpectedly, check
  **Settings → Managed Payments** in the dashboard.

## C. Stripe — create the TEST/SANDBOX webhook

The webhook endpoint must exist (i.e. this code must be deployed) before you can create its
signing secret in the Stripe Dashboard — that's why `STRIPE_WEBHOOK_SECRET` doesn't exist yet.

1. Deploy this branch to Vercel first (a redeploy after merging is enough — the endpoint doesn't
   need the webhook secret to exist in order to deploy; it fails closed with a safe 503 until
   configured).
2. In the Stripe Dashboard (TEST/SANDBOX mode), go to **Developers → Webhooks → Add endpoint**.
3. **Endpoint URL**: `https://armonyapp.vercel.app/api/stripe/webhook`
4. **Events to send** — select exactly these:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Save the endpoint. Stripe shows a **Signing secret** starting with `whsec_...` — copy it
   directly into Vercel as the environment variable:
   ```
   STRIPE_WEBHOOK_SECRET
   ```
   **Never** paste this value into Claude, a chat, or commit it anywhere in the repository.

## D. Vercel — redeploy after adding the webhook secret

Adding or changing an environment variable in Vercel does **not** retroactively apply to an
already-running deployment — you must trigger a new deployment (redeploy the latest commit, or
push a new one) for the running instance to actually read `STRIPE_WEBHOOK_SECRET`. Until that
redeploy, the webhook route keeps returning its safe 503 "not configured" response — Stripe will
show these as failed deliveries in the dashboard until the redeploy picks up the secret; that's
expected and not a bug.

## E. Manual end-to-end QA (TEST/SANDBOX, real Stripe test cards)

Use [Stripe's documented test card numbers](https://docs.stripe.com/testing) — e.g. `4242 4242
4242 4242` for a normal successful payment. Any future expiry date, any CVC, any postal code.

1. **Trial user buys monthly Pro.** Sign in as a normal trialing account → Account or Pricing →
   choose Monthly → complete Checkout with a test card → land on the success page.
2. **Webhook activates Pro.** Within a few seconds, check **Stripe Dashboard → Developers →
   Webhooks → (your endpoint) → recent deliveries** — `checkout.session.completed` and
   `customer.subscription.created` should show `200`.
3. **Account shows Pro.** Refresh `/account` — it should show "Pro monthly", the price, and next
   charge date instead of the trial card.
4. **`/app` opens.** Visit `/app` directly — Armony should load normally.
5. **Expired-trial QA account buys Pro and regains access.** Using the dedicated QA account from
   `docs/supabase-setup.md` §8 (trial already manually expired), sign in, buy Pro, and confirm
   `/app` now opens (regression check: expired trial + no Pro must still deny access — verify that
   *before* this step on the same account, then verify it flips to allowed *after*).
6. **Annual checkout.** Repeat step 1 with the Annual plan on a separate test account; confirm
   Account shows "Pro annual" and an access-until date.
7. **Cancellation at period end.** In the Stripe Dashboard, cancel a test subscription with "cancel
   at period end" (or use the Stripe CLI: `stripe subscriptions update <id>
   --cancel-at-period-end=true`). Confirm the webhook fires `customer.subscription.updated`, and
   Account now shows the "access remains until {date}, won't renew" notice — while `/app` still
   opens (Pro access must NOT drop immediately).
8. **Payment failure / past_due (if practical).** Use a Stripe test card that fails on renewal
   (e.g. `4000 0000 0000 0341` attaches but fails future charges) or trigger a test-clock advance
   via the Stripe CLI/dashboard's test clocks feature. Confirm `invoice.payment_failed` fires, the
   account's `subscription_status` becomes `past_due`, Account shows the payment-issue notice, and
   `/app` **still opens** (past_due preserves access temporarily).
9. **Sign out/in confirms persistence.** Sign out and back in on a Pro account — Account should
   still show Pro immediately, with no re-checkout prompt.

## E.1 Manually verified in the real Stripe TEST/SANDBOX + Supabase + production Vercel deployment

The following was actually performed and confirmed working end-to-end (not just unit-tested) —
recorded here as the authoritative record of what real-world QA has and hasn't covered:

- **Monthly checkout, on a previously-expired trial account.** An ONA account whose original
  72-hour trial had already expired purchased ONA Pro Monthly. Stripe Checkout completed; the
  webhook synchronized the subscription into `platform_billing`; Account correctly showed "Pro
  monthly", €7.99/month, and a renewal date; the account regained access to `/app` (§E.1/E.4/E.5
  above, all confirmed).
- **Annual checkout, on a Google-authenticated account.** A separate account, signed in via Google,
  purchased ONA Pro Annual at €59.99/year; Account correctly showed "Pro annual" and an
  access-until date (§E.6, confirmed).
- **Cancellation at period end.** The annual subscription was canceled in the Stripe Dashboard with
  "cancel at the end of the current period" (no refund). The webhook updated ONA correctly; Account
  showed "Pro annual", an access-until date matching the real period end, and the "won't renew"
  notice; `/app` remained accessible after cancellation, exactly as `cancel_at_period_end` is
  designed to behave (§E.7, confirmed).
- **Not yet completed:** sign-out/sign-in persistence for the passwordless-email QA account (§E.9)
  — blocked during this QA pass by Supabase's built-in email service returning
  `over_email_send_rate_limit` after repeated magic-link requests. This is an email-DELIVERY
  limitation of Supabase's shared/default email sending, not a billing defect — Google OAuth
  sign-out/in continued to work normally throughout. **Configuring a production SMTP provider in
  Supabase (Project Settings → Auth → SMTP Settings) removes this rate limit and is a genuine
  pre-launch task, but is explicitly OUT OF SCOPE for this billing patch** — it doesn't touch
  Stripe, `platform_billing`, or entitlement logic at all.
- **Not yet manually tested:** `past_due`/payment-failure behavior (§E.8) — this remains covered
  by automated tests only (`src/domain/entitlements/billing.test.ts`'s `past_due` cases), not a
  real Stripe test-clock/failing-card run. Do not treat it as end-to-end verified.
- **Sandbox receipt emails are not sent automatically** by Stripe TEST/SANDBOX mode by default —
  during this QA pass they were manually previewed/sent from the Stripe Dashboard (Payments →
  the relevant Checkout/Invoice → "Send receipt" or the dashboard's email preview) rather than
  arriving unprompted, which is expected sandbox behavior, not a configuration gap.

## E.2 "Manage subscription" UX fix (this patch)

Earlier, Account's Pro state showed a **"Manage subscription"** button whose destination was
simply `https://link.com` — misleading, since clicking it only opens Link's generic landing
experience, not this specific ONA subscription (confirmed during the sandbox QA above).

**Investigated whether Stripe's API exposes a transaction-specific Managed Payments/Link
management URL that could be generated/retrieved server-side and verified as belonging to the
authenticated user's subscription:** inspecting the `stripe@22.5.0` package's own bundled
TypeScript definitions (`node_modules/stripe/cjs/resources/{Checkout/Sessions,Subscriptions}.d.ts`)
shows the `ManagedPayments` object on both a Checkout Session and a Subscription contains
**only** `{ enabled: boolean }` — no URL field of any kind. Stripe's own Managed Payments
documentation states that the customer's transaction-specific Link management access arrives via
the **receipt/notification email Stripe sends the customer directly** (a Link-associated URL tied
to that specific purchase) — never something this app's server can generate, retrieve, or verify
via the Checkout/Subscription/Invoice APIs. `Invoice.hosted_invoice_url` and
`Charge.receipt_url` do exist, but are documented as viewing/paying a specific invoice or receipt,
not as a subscription self-service management portal, so neither was used as a substitute.

**Conclusion: no officially-supported, API-retrievable, transaction-specific management URL
exists to build a direct "Manage subscription" button from.** Account's Pro state now shows
explanatory text instead (`platform.account.manage.{title,body}` in
`messages/en.json`/`messages/es.json`) explaining that Stripe emails the customer a link to Link
for subscription/payment-method management, plus a clearly-labeled secondary link to
`https://link.com` (`manage.openLink`) that is never presented as opening this subscription
directly.

## F. Tax QA (Managed Payments)

Because Managed Payments makes Stripe the merchant of record, Stripe — not this app — handles
indirect tax (VAT/GST/sales tax) calculation, collection, and remittance, and may adjust what a
customer is actually charged based on their location and applicable tax rules. This app never
calculates or displays its own tax breakdown; it only ever passes the two configured flat Price
IDs to Checkout. **Before any live launch**, the account owner should personally verify, directly
in the Stripe Dashboard (not by asking this app):

- The Monthly and Annual Price objects' `tax_behavior` setting (`inclusive`/`exclusive`/
  `unspecified`) — this determines whether the €7.99/€59.99 figures shown in the ONA UI are
  tax-inclusive (what most customers actually pay) or have tax added on top at Checkout. Whichever
  it is, confirm it matches what the UI's copy implies.
- What a real Checkout Session actually charges a test customer in at least one EU country and one
  non-EU country, to confirm the final charged amount matches expectations.
- Managed Payments' own eligibility/tax settings under **Settings → Managed Payments** in the
  dashboard.

This document does not change any Stripe Price object automatically, and neither does the
application code — the displayed prices (€7.99/month, €59.99/year) are UI copy only
(`messages/en.json`/`messages/es.json`), entirely independent of what Stripe actually charges.
Keep them in sync manually if the Stripe Price objects ever change.

## What has now been confirmed vs. what still hasn't

**Confirmed end-to-end against the real Stripe TEST/SANDBOX + Supabase + production Vercel
deployment** (see §E.1 for the full account): monthly checkout on a previously-expired-trial
account, webhook activation, Account correctly showing Pro state, regained `/app` access; annual
checkout on a Google-authenticated account; cancellation at period end with access correctly
retained until the period genuinely ends; the corrected "manage subscription" explanatory copy no
longer implying `link.com` opens the subscription directly.

**Still not manually end-to-end tested** — do not treat these as verified:

- `past_due`/payment-failure behavior (§E section 8) — covered by automated tests only
  (`src/domain/entitlements/billing.test.ts`'s `past_due` cases), never a real failing-card or
  Stripe test-clock run.
- Sign-out/sign-in persistence specifically for a passwordless-email account (§E section 9) —
  blocked during QA by Supabase's default email service's `over_email_send_rate_limit` after
  repeated magic-link requests; Google OAuth sign-out/in was confirmed working normally. Retry
  this once a production SMTP provider is configured (see §E.1) or after the rate limit's window
  passes.
- Webhook signature verification against a REAL `whsec_...` secret was exercised as part of the
  confirmed flows above (the webhook only ever activated Pro because signatures verified
  correctly), but the specific invalid-signature/missing-signature REJECTION paths were only ever
  exercised via automated tests and local smoke testing, not by deliberately sending a
  malformed/unsigned request to the real production endpoint.

What *is* covered by automated tests regardless of live credentials: the full trial+Pro
entitlement combination logic for all 10 scenarios in
`src/domain/entitlements/overallStatus.test.ts`, the `hasProAccess` status rules in
`src/domain/entitlements/billing.test.ts`, plan/Price-ID mapping and plan-identifier validation,
the Stripe env-config contract (including the webhook secret's fail-closed behavior) in
`src/platform/stripe/env.test.ts`, Stripe subscription-status parsing in
`src/platform/stripe/syncSubscription.test.ts`, and the "manage subscription" copy regression
guard in `src/components/platform/account/manageSubscriptionCopy.test.ts` — plus `next build`
succeeding and the checkout route responding safely (401/400/503, never a raw crash) when
Stripe/Supabase env vars are absent, confirmed via manual smoke testing against a local dev
server.
