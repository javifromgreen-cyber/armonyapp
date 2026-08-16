# Architecture

## Stack decision

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript (strict) | Single project serves the marketing site and `/app`; file-based routing fits the public/app split; server components keep marketing pages fast and SEO-friendly while the app is client-heavy. |
| Styling | Tailwind CSS | Fast iteration for a solo developer, easy dark-first theming via CSS variables + Tailwind tokens, no runtime CSS-in-JS cost. |
| Auth + DB | Supabase (Postgres + Auth + Row Level Security) | Managed Postgres, built-in email/password + email verification + password reset + Google OAuth, RLS gives per-user data isolation without a bespoke API layer, generous free tier, low ops burden for a solo dev. |
| Billing | Stripe (Checkout + Webhooks) | Spec mandates it; handles PCI scope entirely; Checkout covers the single Annual license subscription. **Revised R1**: the previous "and the lifetime one-time payment" no longer applies — there is no Lifetime license (`docs/product-spec.md` §25). |
| Audio | Tone.js (built on Web Audio API) | Scheduling, synths and transport primitives out of the box; avoids hand-rolling audio-clock math for progression playback. |
| Harmonic map rendering | Custom deterministic SVG renderer (no Canvas/force-physics, no generic graph library) | The map is not a generic force-directed graph — layout must express harmonic depth (Zoom 1–4) and relationship type, which a general-purpose graph library (react-flow, cytoscape) would fight against. A small custom renderer keeps the "every edge has musical meaning" rule enforceable and keeps the bundle light. **v1 decision (recorded ahead of Phase 4, not yet implemented):** plain SVG with deterministic (non-physics) layout — the visible map shows a local harmonic neighborhood (current chord + its relevant edges at the active Zoom level), never a large simultaneous node set, so a physics/force-directed simulation is unnecessary complexity. SVG also gets DOM-native accessibility (focus, ARIA, keyboard nav) essentially for free, which a Canvas renderer would have to reimplement by hand. Revisit only if this becomes a real rendering-performance bottleneck. **Revised R1**: this renderer choice still holds, but the map's UX MODEL is revised — a progressive harmonic path explorer (chosen path + all next-move options from the current endpoint, never a truncated top-N) rather than a fixed local neighborhood; see `docs/product-spec.md` §0/§30. Implementation is Phase R3, not yet built. |
| i18n | `next-intl` | Native App Router support, namespaced JSON message files, type-safe message keys, no hard-coded copy in components. |
| Testing | Vitest (unit/domain) + Playwright (e2e, added in Phase 15) | Vitest is fast and TS-native for the music engine; Playwright is the standard for the e2e flows listed in the spec. |
| Package manager | npm | Default, zero extra tooling. |

## Repository layout

```
/docs                      product-spec.md, architecture.md, roadmap.md, music-engine.md
/.claude/skills            music-theory-review, product-scope-review, release-check
/src
  /domain                  framework-free TypeScript, the "music engine" — no React, no Next imports
    /notes                 pitch classes, note naming, enharmonic spelling
    /intervals              interval math
    /chords                 chord formulas, construction, parsing, chord catalogue
    /keys                   keys, scales, scale degrees
    /harmony                harmonic functions, relationships, substitutions, transposition
    /graph                  harmonic graph generation, Zoom 1-4 classification
    /instruments
      /guitar                fretboard model, voicing generation + ranking
      /bass                  fretboard model, patterns/arpeggios
      /piano                 keyboard model, voicings/inversions
    /entitlements            entitlement status (trialing/active/expired) -> capability flags, pure functions, no Stripe/Supabase imports
  /platform                 platform-shell metadata — NOT music domain: tool catalogue (tools.ts), mock account data (mockAccount.ts, P0 only)
  /app/[locale]             Next.js App Router: marketing routes + /app (the product) routes, one locale segment
                            globals.css (Tailwind entry + dark-first design tokens, plus the separate .ona-shell token set) lives in src/app
  /components               presentational + composed UI components (React), consume /domain only through hooks/adapters
    /platform                ONA platform shell (header/footer/logo/locale switcher/home sections/account states) — separate from Armony's own components
  /server                   Supabase server clients, Stripe webhook handlers, route handlers
  /lib                      cross-cutting utilities (not music domain, not UI)
  /i18n                     next-intl routing/navigation/request config
  proxy.ts                  next-intl locale routing (Next.js 16 "Proxy" convention)
/messages                   en.json / es.json translation namespaces (next-intl)
/supabase
  /migrations               SQL migrations
  seed.sql
```

The `/domain` boundary is the most important architectural rule in this codebase: it must never
import React, Next.js, or Supabase/Stripe clients. UI and persistence adapt to the domain, not the
other way around. This is what keeps "music theory correctness" independently testable and keeps
components from accumulating hidden harmonic rules.

## Entitlements

**Revised R1, then R3.4, implemented in ONA Functional Phase 1, extended in Phase 2 with real
Stripe Pro** — R1 replaced the previous permanent `plan: "free" | "pro"` model
(`docs/product-spec.md` §25/§26); R3.4 made explicit that this entitlement is PLATFORM-LEVEL, not
Armony-specific — Armony is documented as the first app in a future multi-app platform
(`docs/product-spec.md` §0/§2), so this module models one account-wide `trialing`/`active`/
`expired` status shared by every platform app, never a per-app flag like
`armony_pro`/`future_app_2_pro`. There is no permanent Free tier and no Lifetime license; access is
governed by the 72-hour full-platform trial and, as of Phase 2, a real annual/monthly Platform Pro
subscription via Stripe (`CLAUDE.md`'s commercial model: one subscription unlocks every app, no
tiers).

`src/domain/entitlements` (framework-free — no React/Next/Supabase/**Stripe** imports, per this
file's `/domain` boundary rule, which names Stripe explicitly for this exact reason) maps an
account's PLATFORM entitlement **status** to a typed capability object:

```ts
type EntitlementStatus = "trialing" | "active" | "expired";

interface Entitlements {
  status: EntitlementStatus;
  canUseApp: boolean; // full harmonic navigation, all Zoom depths, complete instrument catalogues
  canSaveProjects: boolean;
  canExport: boolean; // PDF/TAB export (docs/product-spec.md §20)
}
```

There is no `maxHarmonicZoom`/depth cap and no `voicingCatalogue: "basic" | "full"` split in this
model — all four Zoom depths and each instrument's complete catalogue are part of `canUseApp`
(`docs/product-spec.md` §9/§13–15), not independently gated. A numeric project-count cap, if any is
ever added for `active` accounts, is a decision for the phase that implements enforcement (Phase
11), not decided here.

`EntitlementStatus` is the OVERALL tri-state result, not Stripe's own richer per-subscription
vocabulary — that lives separately as `StripeSubscriptionStatus`
(`src/domain/entitlements/billing.ts`: `active`/`trialing`/`past_due`/`canceled`/`incomplete`/
`incomplete_expired`/`unpaid`/`paused`, matching Stripe's `Subscription.status` values). `"active"`
here means "has Pro access right now", computed by `hasProAccess` from the stored
`StripeSubscriptionStatus` + `currentPeriodEnd` — `active`/`trialing` grant access while their
period hasn't lapsed, `past_due` grants it unconditionally while Stripe retries payment, every
other raw status denies it. `computeOverallStatus`
(`src/domain/entitlements/overallStatus.ts`) is the entire "trial and Pro are independent" rule
from product-spec.md §9 in one place: Pro always wins when present, otherwise the account falls
back to its own 72-hour trial's `trialing`/`expired` status — trial timestamps are never touched by
billing events (separate tables, separate writers — see "Data model" below), so a canceled
subscription never restarts or shortens a still-active original trial, and Pro overrides an
already-expired one.

Server-side, `getPlatformAccess()` (`src/platform/access/getPlatformAccess.ts`) is the single entry
point: it calls Supabase's `getUser()` (JWT-revalidating, not the unsafe `getSession()`) to
identify the visitor, reads both `platform_access` (trial) and `platform_billing` (Stripe) rows,
and combines them via `computeOverallStatus` — never from client-supplied state. The
`platform_billing` read has its OWN isolated error handling (`fetchBillingSnapshot`): a failure
there (including the Phase 2 migration not having been applied yet in some environment) fails
closed for Pro without taking down trial-based access. Every page/route that needs auth or access
state calls this one function rather than talking to Supabase directly. There is no
`useEntitlements()` client hook — access state is resolved server-side per request, matching the
project's "never trust client-side entitlement state" rule.

### Stripe integration (Phase 2)

- `src/platform/stripe/env.ts` — the only place `STRIPE_SECRET_KEY`, the two configured Price IDs,
  and `STRIPE_WEBHOOK_SECRET` are read from, mirroring `src/platform/supabase/env.ts`'s pattern.
  Guarded by `import "server-only"` so an accidental client-bundle import is a build-time error.
  `STRIPE_WEBHOOK_SECRET` is read only by the webhook route, not by checkout — the app must build
  and the checkout flow must work before that secret exists (see `docs/stripe-billing-setup.md`).
- `src/platform/stripe/client.ts` — the single `getStripeClient()` factory, pinned to the installed
  `stripe@22.5.0` package's own default API version (`2026-07-29.dahlia`) explicitly rather than
  implicitly, so a future SDK bump that changes the default is a reviewed TypeScript error, not a
  silent behavior change.
- `src/platform/supabase/admin.ts` — the ONLY Supabase client allowed to bypass RLS, built directly
  with `@supabase/supabase-js`'s `createClient` (not the cookie-aware `@supabase/ssr` client),
  session persistence/refresh both disabled since it's never tied to a visitor. Used exclusively by
  `src/app/api/stripe/checkout` and `src/app/api/stripe/webhook` to write `platform_billing`.
- `src/app/api/stripe/checkout/route.ts` — creates a Stripe-hosted Checkout Session
  (`mode: "subscription"`, `managed_payments: { enabled: true }`, quantity 1). The client sends
  only a trusted `"monthly" | "annual"` plan identifier — never a raw Price ID — resolved
  server-side via `getStripePriceId`. Reuses an existing Stripe Customer for the account if one is
  on file; verifies against Stripe's own live subscription state (not local data) before blocking a
  duplicate active subscription.
- `src/app/api/stripe/webhook/route.ts` — the authoritative sync path. Verifies the raw-body Stripe
  signature before doing anything else; fails closed (503) if `STRIPE_WEBHOOK_SECRET` isn't
  configured yet. Idempotent via `stripe_webhook_events`: an event ID is recorded only AFTER its
  sync succeeds, never before, so a failed sync can still be retried. For every relevant event,
  always re-`retrieve()`s the CURRENT subscription state from Stripe rather than trusting the
  event payload's own snapshot, to self-correct against out-of-order delivery.
- `src/platform/stripe/syncSubscription.ts` — `syncSubscriptionToSupabase` writes the full current
  billing snapshot (never an incremental delta) keyed by the Supabase user id in the
  subscription's own metadata (set by this app's checkout route, never trusted from anywhere the
  customer could influence). A subscription with no such metadata is refused, not guessed at.

## Data model (Supabase/Postgres)

**As implemented (ONA Functional Phase 1 + Phase 2)**, deliberately smaller than the fuller model
originally sketched below — see "Deviations" for why:

- `platform_access` — `user_id` (PK, references `auth.users`, cascade-deletes with the account),
  `trial_started_at`, `trial_ends_at`, `created_at`. Row is created automatically by a
  `SECURITY DEFINER` trigger (`handle_new_platform_user()`) on `auth.users` insert — see
  `supabase/migrations/20260814120000_platform_access.sql` — never by application code. RLS:
  `select` only, scoped to `auth.uid() = user_id`; no `insert`/`update`/`delete` policy, so the
  client can never write or reset its own trial timestamps. **Untouched by Phase 2** — billing
  events never write here, by design (see "Entitlements" above).
- `platform_billing` (Phase 2, `supabase/migrations/20260816120000_platform_billing.sql`) —
  `user_id` (PK), `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan`
  (`"monthly" | "annual"`, derived server-side from the trusted configured Price IDs — never
  inferred from amount or trusted from Stripe/client input), `subscription_status` (Stripe's raw
  status string), `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`. RLS:
  `select` only for `authenticated`, scoped to the caller's own row; no write policy for any
  client-facing role — only the admin client (service/secret key, bypasses RLS) writes it.
- `stripe_webhook_events` (Phase 2, same migration) — `event_id` (PK, for idempotency),
  `event_type`, `stripe_created_at`, `processed_at`. No RLS policies at all for any client-facing
  role — zero browser access, read or write, under any circumstance.

**Sketched for future phases, not yet built:**

- `profiles` — id (references `auth.users`), display_name, primary_instrument, main_goal,
  locale, marketing_consent, created_at. (`trial_started_at` lives on `platform_access` instead,
  as built — see above.)
- `projects` — id, user_id, name, key_context (nullable — no locked tonal key; this is the TONAL
  "free mode" concept from `docs/product-spec.md` §5/§6, unrelated to account entitlement status),
  instrument, created_at, updated_at. **Revised R3.4**: no `bpm`/`time_signature` columns — Armony
  is not a rhythmic composition tool (`docs/product-spec.md` §16/§18).
- `progression_chords` — id, project_id, chord_symbol, position, created_at. **Revised R3.4**: no
  `duration_beats` column, matching the `projects` revision above.

RLS (future tables): scoped `user_id = auth.uid()`.

## Preview deployment (recorded ahead of Phase 4, not yet set up)

Before or at the start of Phase 4 (the first phase with meaningful visual UI — the harmonic map),
set up a browser-accessible preview deployment so the product can be reviewed visually and
interactively as it's built, rather than only through terminal test output. A managed static/edge
host (e.g. Vercel, matching Next.js) is the natural fit given the stack in the table above — low
setup cost, PR/branch previews out of the box. No environment variables beyond `NEXT_PUBLIC_*`
placeholders are needed until Supabase/Stripe integration lands (Phases 10+), so this can be wired
up early without blocking on backend work.

## Harmonic map: one node per chord, even with multiple relationships (recorded ahead of Phase 4)

The domain layer intentionally allows a single target chord to be reachable via more than one
`HarmonicEdge` — e.g. in C major, `C -> Am` is simultaneously `diatonic`, `relative`, and
`substitution` (see `docs/music-engine.md`'s de-duplication policy for which overlaps are
deliberate vs. bugs). `relationshipsBetween()` returns all of them on purpose; that musical
information must not be discarded.

**Phase 4 requirement:** the visual graph must render exactly ONE node per unique chord (by
enharmonic-invariant identity — root pitch class + quality, i.e. `chordIdentityKey` from
`src/domain/harmony/chordIdentity.ts`), never one node per relationship. When a source chord
connects to a target through multiple relationship types, that's ONE edge/connection in the UI,
carrying all of the applicable relationship types as combined metadata (e.g. badges, a
multi-line explanation) — not multiple parallel edges or duplicate nodes for the same chord. The
graph query layer already groups this correctly (`relationshipsBetween(a, b, context)` returns the
full array of relationships between exactly two chords); the map UI's rendering model must not
flatten that back into one-node-per-edge.

## Deviations from spec

- **No separate top-level `/styles` directory.** Tailwind's entry point and dark-first CSS
  variable tokens live in `src/app/globals.css`, following Next.js App Router convention, and are
  imported once from `src/app/[locale]/layout.tsx`. This is a location choice only — the design
  tokens and dark/light theming approach described in `product-spec.md` §4 are unchanged.
- **Locale-prefixed routing.** To satisfy i18n (§3) without duplicating routes, all routes live
  under `src/app/[locale]/...`. `next-intl`'s `localePrefix: "as-needed"` means the default locale
  (English) is served unprefixed (`/`, `/app`) and Spanish is prefixed (`/es`, `/es/app`), so the
  product's `/app` URL from §2 holds for the default-locale case.
- **Next.js 16 "Proxy" convention.** Next.js 16 renamed the `middleware.ts` file convention to
  `proxy.ts` (same request-interception role, used here for `next-intl`'s locale routing). The
  file lives at `src/proxy.ts`.
- **R1 business-model revision (not an implementation deviation — a source-of-truth spec change).**
  The permanent Free/Pro/Lifetime commercial model in `docs/product-spec.md` was replaced with a
  72-hour full trial followed by a required Annual license; see `docs/product-spec.md` §9/§19/§20/
  §25/§26 and `docs/roadmap.md`'s R1 entry for the full revision and rationale. This is
  documentation-only as of R1 — no application code changed.
- **R3 interaction-rule revision (superseded by R3.1, see below).** Phase 4's "select vs. explore"
  two-click model was first revised in R3 to a hover-previews/click-on-already-previewed-candidate-
  advances model. R3.1 replaced that with a simpler single-click-does-everything model after user
  testing found the two-step model still didn't feel direct enough — see the R3.1 entry below for
  the current behavior. Kept here for history; `PREVIEW`/`CLEAR_PREVIEW` no longer exist in
  `src/components/map/explorerState.ts`.
- **R3 map layout: rings key by move depth, not a chord's shallowest depth (superseded by R3.1,
  see below).** R3 changed `computeRadialLayout` to key concentric rings by `NavigationOption.depth`
  instead of `MapGraphNode.introducedAtDepth`, fixing a ring/badge mismatch — but concentric rings
  themselves turned out to have a bigger problem, fixed in R3.1. Kept here for history.
- **R3.1 map interaction correction: single click/tap/Enter does everything, one shared ring, no
  visible breadcrumb.** Prompted by the user testing the deployed R3 preview and finding two real
  problems: (1) R3's hover-then-second-click model still required an extra step to actually
  navigate, and its visible top-of-screen exploration breadcrumb read as an authored second
  progression rather than incidental map history; (2) R3's depth-keyed concentric rings visually
  implied false parentage — a Zoom-3 option positioned near a Zoom-1 option on an outer ring looked
  like it descended FROM that Zoom-1 option, rather than being an equally-direct move from the
  current chord. Both are fixed structurally: `src/components/map/explorerState.ts` has no
  preview/two-step concept at all now (`ADVANCE`/`BACK`/`RESET`/`SET_CONTEXT` only) — a single
  click/tap/Enter on a candidate calls `onNavigate`, which the parent (`ExplorerApp.tsx`) wires to
  both `playback.hearTransition(...)` and `dispatch({ type: "ADVANCE", ... })` together; hover/
  focus is local-only component state in `HarmonicMap.tsx` (`hoveredChord`) driving purely visual/
  informational treatment, never audio or navigation. `src/components/map/layout.ts`'s
  `computeRadialLayout` now places every outgoing option on ONE shared ring at a radius computed by
  `adaptiveRadius(count)` (clamped to a readable 160-300px range) instead of keying rings by depth
  at all — depth stays real, visible metadata (the existing per-node badge), just never expressed
  as radial distance. The old top-of-screen `PathBreadcrumb` component is deleted; a new
  `MapLocalBack.tsx` renders a compact "‹ PreviousChord" control anchored next to the map itself.
  `src/audio/player.ts`'s `hearPath`/`hearTransition` were also fixed to schedule via
  `Tone.Transport` (reusing `playProgression`'s existing mechanism) instead of raw
  `Tone.now()`-relative offsets, so a rapid second navigation click actually cancels the first
  transition's still-pending notes via `Transport.cancel()` rather than letting both sound
  (previously latent since nothing exercised rapid re-triggering before R3.1's mandatory
  interruption test).
- **R3.2: Harmonic Territories + preview-before-navigation (supersedes R3.1's single-click
  model).** Prompted by further user testing of the deployed R3.1 preview: single-click-does-
  everything removed the ability to audition/compare a candidate before committing to it, and an
  undifferentiated single ring made a dense candidate set (e.g. G7's 18 options) hard to read at a
  glance. Two additions, both layered on top of R3.1's approved foundations rather than replacing
  them:
  - **Domain**: `src/domain/navigation/harmonicTerritory.ts` adds `harmonicTerritoryFor(edge)`, a
    deterministic `HarmonicCharacter -> HarmonicTerritory` mapping (`HARMONIC_TERRITORIES` in
    `types.ts`: natural/tension/modalColour/substitution/exploration) built strictly on top of the
    already-reviewed `harmonicCharacterFor` — it never reads `relationshipType` or
    `harmonicDepth` directly, so it automatically inherits R3's major-mode-only
    strongResolution/deceptive overrides and stays structurally independent of Depth (verified
    empirically too: Depth 1 alone spans both the `natural` and `tension` territories, and Depths
    2/3 each span four of the five territories). `NavigationOption.territory` (`options.ts`)
    exposes it to the UI; `options.test.ts` adds a completeness-invariant suite (union of all
    territories == the full outgoing set, no chord in two territories).
  - **Interaction**: `src/components/map/explorerState.ts`'s reducer gains `previewChord: Chord |
    null` and `PREVIEW`/`CONFIRM`/`CLEAR_PREVIEW` actions (replacing R3.1's single `ADVANCE`).
    `ExplorerApp.tsx`'s `handlePreviewCandidate`/`handleConfirmCandidate`/`handleReplayCurrent`/
    `handleBack` wire these to `playback.hearPath` — always called with the FULL cumulative chord
    array (confirmed steps + the active preview candidate, or just confirmed steps on
    confirm/replay/Back) rather than a single transition, so `src/audio/player.ts`'s
    `hearTransition` is deleted entirely (dead code once every caller passes full arrays) and
    `hearPath`'s guard changes from `length < 2` to `length === 0` to support a single-chord replay
    at the very start. `hoveredChord` stays local `useState` in `ExplorerApp` (unchanged from
    R3.1) but is now explicitly cleared on confirm/Back/Reset/context-change to avoid a stale
    hover pointing at a candidate that no longer exists once the outgoing set regenerates.
  - **Layout**: `src/components/map/layout.ts`'s `computeRadialLayout` is rewritten from a single
    uniform-spacing ring to a two-pass sector algorithm — territory sectors get angular spans
    proportional to member count (with fixed gaps between sectors), then the tightest ACTUAL
    angular gap between any two circularly-adjacent nodes (not an assumed-uniform gap) determines
    the ring radius via the chord-length formula, clamped to the same readable range as R3.1. No
    concentric rings are introduced by this — R3.1's "one shared ring" invariant holds; sectors are
    angular grouping only. `src/components/map/territoryVisuals.ts` (new) maps each territory to a
    colour/dash-pattern/badge, reusing the previously-unused `--color-tonic`/`--color-predominant`
    CSS tokens (confirmed unused elsewhere via grep before repurposing) rather than inventing new
    design tokens; `relationshipVisuals.ts` (the old per-relationship-type visual system) is
    deleted, fully superseded. `src/components/map/MapLegend.tsx` (new) is a compact, expandable
    "How to read the map" popover listing all 5 territories and 4 depths using the exact same
    `territoryVisual()` colours as the map itself, so map and legend structurally cannot drift out
    of sync.
  - **Mobile bottom-sheet interaction with two-step preview (fix applied during this phase's own
    browser verification, not part of the original R3.2 spec)**: opening the mobile bottom sheet on
    PREVIEW (as R3.1 did on its single completed navigation) covers the map before the user gets a
    chance to perform the second activation that confirms it — a real interaction-breaking bug
    caught by live Playwright testing, not a hypothetical. Fixed by only auto-opening the sheet on
    CONFIRM, matching R3.1's original timing (a completed action), while PREVIEW just switches the
    mobile tab selector without forcing the sheet open. A related, narrower issue — the local Back
    control's `z-10` matching the sheet's own `z-10`, so DOM order let the sheet's stacking context
    cover Back once the sheet was open from an earlier confirm — was fixed by bumping Back to
    `z-20`. Both are layout-only fixes to pre-existing R3.1 behavior, made necessary by R3.2's
    interaction changes; no new UI system was introduced.
- **R3.3: global instrument-aware audio + auto-synced progression + legend viewport fix.**
  Prompted by the user personally testing the deployed R3.2 preview. Three independent product
  problems, three independent fixes, all layered on R3.2's approved territory/preview-confirm
  model without touching it:
  - **Legend clipping (root cause + fix).** R3.2's `MapLegend` popover was `position: absolute`,
    anchored to its own toggle button, nested inside `ExplorerApp`'s
    `<div className="flex flex-1 flex-col overflow-hidden">` map-area container. CSS
    `overflow: hidden` clips ALL rendered descendants to that box regardless of a descendant's own
    `position` value (unless the descendant escapes the DOM subtree via a portal) — so on any
    viewport where the popover's content exceeded the map area's own height, its lower rows (Depth
    3/4) were silently clipped at roughly the same vertical position the Progression strip sits at
    below, which read as "the progression covers the legend" even though the real cause was the
    ancestor's `overflow-hidden`, not z-index/stacking order. Fixed in
    `src/components/map/MapLegend.tsx` by switching to a `position: fixed`, viewport-centered
    modal-style overlay (`fixed inset-0` backdrop + a centered panel) — `position: fixed` escapes
    an ancestor's `overflow: hidden` clipping in modern browsers (its containing block is the
    viewport, not the clipped box, absent an intervening `transform`/`filter`/`contain` ancestor,
    and none exists here) — with `max-h-[85vh]` and an internal `overflow-y-auto` region so content
    always stays reachable by scrolling regardless of actual viewport height, rather than a fixed
    pixel height that could still overflow on a short window. Verified via Playwright at three
    viewport heights (900px, 844px mobile, and a deliberately short 650px) in both languages —
    Depth 4 reachable by scrolling in every case.
  - **Global instrument selection.** `src/domain/instruments/instrumentName.ts` (new) hoists the
    `"piano" | "guitar" | "bass"` union (previously three separately-declared local copies — one
    each in `src/audio/player.ts`, `src/components/chordPanel/instrument.ts`) into one canonical
    `InstrumentName` type/`INSTRUMENT_NAMES` const, re-exported from `src/domain/instruments`'s
    barrel. `src/components/chordPanel/instrument.ts` is deleted; `InstrumentSelector.tsx` moves
    from `chordPanel/` to `components/controls/` (it's no longer chord-panel-scoped) and now reads
    the shared domain type. `ExplorerApp.tsx`'s existing `activeInstrument` state (already the
    single source of truth — R3.2's right-panel selector already read/wrote it) is now ALSO
    rendered as a toolbar control (`ExplorerApp.tsx`'s header row, alongside Hear Path/Reset/
    Legend) instead of only inside `ChordContextPanel`; `ChordContextPanel` loses its own
    `InstrumentSelector` render and its `onInstrumentChange` prop entirely — it only reads
    `activeInstrument` now, to decide which of Piano/Guitar/Bass to render. No new state was
    introduced; this is a UI-placement change plus a type consolidation, not an architecture change.
  - **Instrument-aware map/path audio.** `src/audio/instrumentVoicing.ts` (new) adds
    `representativePitchesFor(chord, instrument)` (Piano: `pianoVoicingsFor(chord)[0].pitches`;
    Guitar: `guitarVoicingsFor(chord)[0]`'s sounding string pitches) and
    `representativeBassSteps(chord, maxSteps = 2)` (the first 2 steps of
    `bassPatternsFor(chord)[0]`, played as a short sequential excerpt rather than a simultaneous
    block chord — Bass stays a melodic/sequential instrument even here, never "converted into
    Piano-style chords", per the governing spec). All three reuse the EXISTING, already-reviewed
    domain catalogues verbatim — no new voicing/pattern generation logic, confirmed via
    `music-theory-review`. `src/audio/player.ts`'s `hearChord`, `hearPath`, and `playProgression`
    all gain a required `instrument: InstrumentName` parameter and now trigger that instrument's
    real `Tone.Sampler` (via the existing `getInstrumentVoice`/lazy-load/cache machinery from Phase
    R2) instead of the neutral `PolySynth`; a shared `scheduleInstrumentChord` helper handles the
    Piano/Guitar (one block-chord `Tone.Transport` event) vs. Bass (steps spread across the same
    slot) branching once, reused by both `hearPath` and `playProgression`. The neutral synth
    (`getSynth()`) survives only as `hearPitches`'s unused `voice: "default"` fallback — every
    actual caller in the app is now instrument-routed. The R3.1/R3.2 `Tone.Transport`-based
    cancellation architecture (`stopProgression()` first, `Transport.cancel()` clears pending
    events) is completely unchanged — only which sampler/pitches get scheduled changed, not how
    scheduling/cancellation works. Verified both via updated `player.test.ts` (Sampler-routing,
    Bass's 2-note-sequence-not-block-chord, interruption-still-cancels assertions) AND live
    Playwright network-request interception confirming actual HTTP requests to
    `/audio/guitar/*.mp3`/`/audio/bass/*.mp3` fire when previewing with those instruments selected
    — not just UI/state assertions.
  - **Progression auto-synced to the confirmed path.** The core architectural change:
    `src/domain/progression/fromNavigationPath.ts` (new) adds `progressionFromPath(navPath, bpm,
    timeSignature)`, a PURE PROJECTION from `NavigationPath.steps` to `ProgressionItem[]` (id
    derived from position — safe specifically because `navPath.steps` only ever grows/shrinks at
    its tail, never splices mid-array) — never a second, imperatively-mutated copy of the
    progression that could drift from navigation state. `ExplorerApp.tsx` computes
    `progression = useMemo(() => progressionFromPath(state.navPath, bpm, timeSignature), ...)`
    instead of running a separate `progressionReducer`. This single change gives every one of the
    spec's required behaviors for free, structurally, with no extra bookkeeping: the starting chord
    is always item 1 (navPath always has ≥1 step); a previewed candidate is never included
    (`previewChord` lives outside `navPath` entirely); confirming appends exactly once
    (`advancePath` pushes exactly one step); Back removes exactly the last item (`goBack` pops
    exactly one step, and — already true of `goBack` since Phase R3, unmodified — never below the
    starting chord); a root/context change resets to just the new root (`SET_CONTEXT` rebuilds
    `navPath` via `initialExplorerState`, a fresh single-step path). `src/domain/progression/
    progression.ts` is trimmed to just the constants/`clampBpm` that survive (`createEmptyProgression`,
    `createProgressionItem`, `addItem`, `removeItem`, `reorderItem`, `setItemDuration`,
    `clearProgression`, `transposeProgression` are all deleted — genuinely unreachable once nothing
    dispatches the actions that called them, confirmed via `git diff`/full-repo grep before
    deletion). `src/components/progression/progressionReducer.ts` is deleted entirely; BPM/time
    signature become plain `useState` in `ExplorerApp` (survives Back/Reset/root-changes
    deliberately, since tempo/meter are orthogonal to harmonic content). `ProgressionEditor.tsx`/
    `ProgressionChordCard.tsx` lose per-item reorder/remove controls and whole-progression
    transpose — **a deliberate removal, not an oversight**: once an item's position/presence is
    derived from navigation history, a control that could move/delete/relabel it independently
    would silently violate "Progression === Confirmed Path" (transpose specifically mutates chord
    identity via `transposeChord`, which would diverge the displayed/played progression from the
    actual explored key permanently). `ChordContextPanel`'s "Add to progression" button is removed
    entirely, along with its `onAddToProgression` prop — there is no code path left that mutates
    the progression independently of navigation. `resolveHistoryContext`
    (`src/domain/navigation/ranking.ts`) is UNCHANGED and still technically takes a separate
    `Progression` argument for its R3 precedence rule (prefer the real progression's history when
    its last chord matches the current endpoint) — that rule is now permanently a no-op in practice
    (the progression's last chord always matches the endpoint by construction), but left as-is
    rather than refactored, since it's still correct, low-risk, and out of this phase's stated
    scope. `music-theory-review`/`product-scope-review` confirmed §70's question (is "Hear Path"
    now redundant with "Progression Play"?) has a real answer, not just "keep both by default":
    at the time of R3.3, Hear Path used a fixed quick per-chord gap (exploratory pacing,
    instrument-aware since this same phase) while Progression Play used real
    BPM/time-signature/per-item-duration timing (`buildProgressionSchedule`) — a quick route-check
    vs. a tempo-accurate performance of the same chords, genuinely different purposes, not
    redundant. **Superseded by R3.4** (see below) — BPM/time signature were removed entirely, and
    Progression Play now uses the SAME fixed pacing as Hear Path; both controls are kept anyway,
    now for UI-context reasons rather than timing-model reasons.
- **R3.4: Armony product closure — progression simplified to a chord list, Guitar/Bass beginner
  headings, item-level "Pro" badge removed, platform vision documented.** Prompted by the user
  personally testing the deployed R3.3 preview and declaring this the final Armony-only refinement
  before the product moves toward shared platform infrastructure. Four independent changes:
  - **Progression UI stripped to chord-list + Play.** `src/domain/progression/types.ts`'s
    `Progression`/`ProgressionItem` lose `bpm`, `timeSignature`, and `durationBeats` entirely — not
    hidden, deleted from the type. `fromNavigationPath.ts`'s `progressionFromPath(navPath)` drops
    its `bpm`/`timeSignature` parameters accordingly. `src/domain/progression/progression.ts` is
    trimmed further to just `DEFAULT_BPM` (repurposed — see below); `MIN_BPM`/`MAX_BPM`/
    `DEFAULT_TIME_SIGNATURE`/`DEFAULT_DURATION_BEATS`/`clampBpm` are deleted, genuinely unreachable
    once nothing reads a user-adjustable BPM/time-signature/duration anymore (confirmed via
    `git diff`/grep before deletion, same discipline as R3.3's progression-function cleanup).
    `src/audio/scheduling.ts` (`buildProgressionSchedule`/`progressionDurationSeconds`/
    `secondsPerBeat`) is deleted outright — nothing computes a BPM-derived schedule anymore.
    `ExplorerApp.tsx` drops its `bpm`/`timeSignature` `useState` and the `handleSetBpm`/
    `handleSetTimeSignature` handlers entirely. `ProgressionChordCard.tsx` renders only the chord
    symbol (no "X beats" label); `ProgressionEditor.tsx` renders the chord-card strip plus a single
    Play/Stop button — no BPM input, no time-signature select — and the button's disabled-when-
    empty branch is removed too, since `progression.items` can no longer legitimately be empty
    (`navPath` always has ≥1 step, unchanged since R3).
  - **Progression playback: fixed pacing, not BPM math.** `src/audio/player.ts`'s
    `playProgression` no longer calls `buildProgressionSchedule` — it schedules
    `progression.items` directly through the same `scheduleInstrumentChord` helper `hearPath`
    already used, with the SAME `PATH_CHORD_GAP_SECONDS`/`PATH_CHORD_DURATION_SECONDS` constants.
    This means Hear Path and Progression Play are now, by construction, playing the identical
    chord sequence at the identical pacing through the identical instrument — reviewed explicitly
    in `product-scope-review` (§9 of the governing spec) and kept as two controls anyway because
    they serve different UI contexts (a quick replay anchored to the map vs. a Play/Stop control
    with per-chord highlighting on the visible progression strip), not because they behave
    differently musically anymore. `DEFAULT_BPM` (90) survives as a plain constant, repurposed as
    the fixed tempo reference for Bass's "Hear this pattern" step timing (an exact-playback,
    instrument-specific control, unrelated to the removed progression-level BPM) —
    `ChordContextPanel.tsx`'s bass step-timing calculation now reads this constant directly instead
    of a `bpm` prop threaded from the (now nonexistent) progression BPM state; this preserves the
    exact same 90bpm-equivalent timing "Hear this pattern" already defaulted to, so it's a
    state-plumbing simplification, not an audible behavior change for anyone who never touched the
    removed BPM field.
  - **Guitar/Bass beginner-clarity headings.** `GuitarVoicingPanel.tsx` and `BassPatternPanel.tsx`
    each gain a small `<h4>` heading ("Fingering diagram" / "Diagrama de digitación", new
    `app.guitar.fingeringDiagramHeading`/`app.bass.fingeringDiagramHeading` i18n keys) directly
    above their respective diagram/fretboard visual, establishing the section hierarchy the
    governing spec asked for (instrument title → fingering diagram heading → visual → position/
    inversion info → suggested fingering → TAB → "Hear this voicing/pattern"). Piano's keyboard
    visual is self-evidently a piano keyboard and was left alone — the spec's beginner-clarity
    concern was specifically about Guitar/Bass's fretboard-diagram visuals, confirmed via the
    governing spec's own §10-13 framing. No shape/pattern/voicing GENERATION logic touched — purely
    explanatory UI.
  - **Item-level "Pro" badge removed.** `PianoVoicingPanel.tsx`, `GuitarVoicingPanel.tsx`, and
    `BassPatternPanel.tsx` each rendered a small "Pro" badge next to any voicing/shape/pattern whose
    `catalogue === "pro"` (e.g. "Movable shape — Pro") — a leftover from the pre-R1 permanent-tier
    business model that R1's own spec revision (`docs/product-spec.md` §13) had already declared
    obsolete in principle but never actually removed from the rendered UI. All three badge blocks
    are deleted; every voicing/shape/pattern in the catalogue renders identically regardless of its
    internal `catalogue` label, and `git grep '\.catalogue'` across `src/components` now returns
    zero matches — confirmed no other UI consumer reads it. The internal `VoicingCatalogue =
    "free" | "pro"` domain type (`src/domain/instruments/piano/types.ts`, shared by guitar/bass via
    re-export) is DELIBERATELY RETAINED, per the governing spec's explicit "do not undertake a
    risky catalogue/domain rewrite merely to delete internal metadata if it is still structurally
    useful" instruction — its doc comment is rewritten to document that it's legacy metadata,
    unused for any gating/hiding/locking/entitlement/trial/Pro purpose now that Armony's commercial
    model is a single platform-wide entitlement (`docs/product-spec.md` §25-26), kept only as a
    structurally cheap "small curated set vs. fuller generated catalogue" distinction in case a
    future non-commercial feature (e.g. a density toggle) wants it again. `proBadge` i18n keys
    deleted from all three instrument namespaces (EN/ES) as now-unused.
  - **Platform vision documented (no implementation).** `docs/product-spec.md` §0/§2 add a
    "platform positioning" note: Armony is the first app in a future multi-app platform for music
    composition/understanding (name undecided — never assume "Armony"), sharing one future account/
    entitlement/billing system rather than each app being separately purchased; §19/§20/§25/§26 are
    revised to make the 72-hour trial and annual license explicitly PLATFORM-WIDE (every app that
    exists, not Armony-only) rather than rewording around it implicitly. This is a documentation-
    only change — no auth/Supabase/Stripe/billing/entitlement-enforcement code exists yet, and
    `docs/roadmap.md`'s "Roadmap After Armony" section records the intended future high-level
    sequence (Platform Foundation, then individually-designed future mini-apps) without building or
    scoping any of it now.
- **Platform Foundation P0: ONA platform shell, visual only.** The platform's provisional name is
  now decided — **ONA** ("wave" in Catalan) — superseding R3.4's "name undecided" note; still never
  assume it becomes final without explicit confirmation. This phase builds the first VISUAL slice of
  the "shared website shell" line item from `docs/roadmap.md`'s "Roadmap After Armony" (home,
  sign-in, account, trial-ended, legal placeholders, tools catalogue) — explicitly NOT the
  auth/entitlement/persistence/billing infrastructure those same bullets also list; that remains
  Phases 10A–13, unstarted. Armony itself is untouched functionally — only a one-line discreet
  back-link was added to its page shell.
  - **New top-level `src/platform/` module** (deliberately NOT under `src/domain` — this is
    product/catalogue metadata, not music theory): `tools.ts` holds the centralized app catalogue
    (`{id, route}[]`, currently just `armony`) that `ToolsCatalogue`/`ToolCard` render generically
    by localized-key lookup, so a second future app is one array entry, not a new component.
    `mockAccount.ts` centralizes the ONLY invented account data in the codebase (email, access
    status, a relevant date) behind `getMockAccount(status)`, so it's trivially deletable once a
    real entitlement system (Phase 11) exists.
  - **New `src/components/platform/` tree**: `PlatformHeader` (public/loggedIn variant prop, no
    real session read), `PlatformFooter`, `Logo`/`LogoLink` (typographic "ONA" wordmark — no
    approved raster/vector asset was supplied to this build; swapping in a real logo later means
    editing this one file), `LocaleSwitcher` (swaps the locale segment via next-intl's locale-aware
    router, preserving path/query/hash), `MobileNav` (a plain disclosure drawer, no new dependency),
    `AuthShell` (minimal brand+language bar for the focused sign-in/trial-ended screens, deliberately
    NOT the full marketing header), `LegalPage` (shared shell for the three placeholder legal
    routes), `PlatformBackLink` (the sole ONA presence inside Armony — see below), and a `home/`
    subtree (`Hero`, `HeroWaves`, `IntroSection`, `ToolsCatalogue`, `ToolCard`, `ToolCardVisual`,
    `TrialSection`, `PricingSection`, `FinalCta`) plus an `account/AccountStateCard` covering the
    four documented access states (trialing/monthly/annual/cancelled).
  - **Separate token namespace, not a redesign of Armony's tokens.** `src/app/globals.css` adds a
    SECOND, independent set of CSS variables scoped to a new `.ona-shell` class (`--ona-bg`,
    `--ona-surface`, `--ona-border`, `--ona-fg`, `--ona-fg-muted`, `--ona-accent`,
    `--ona-accent-foreground`), registered as `bg-ona-*`/`text-ona-*` Tailwind utilities via
    `@theme inline`. Armony's own `--background`/`--surface`/`--accent`/etc. tokens (and the
    harmonic-territory colors) are completely untouched — the two palettes never merge, matching the
    governing spec's "the platform should be visually restrained enough that individual apps can
    later introduce their own visual identities" and "Armony should visually belong to ONA without
    losing its own identity." Every ONA page wraps its content in a `.ona-shell` div; nothing under
    `/app` does.
  - **Routes added**, all under `src/app/[locale]/`: `page.tsx` (replaced the old placeholder
    marketing page with the full ONA home — Hero/Intro/ToolsCatalogue/TrialSection/PricingSection/
    FinalCta, `#tools`/`#pricing` in-page anchors), `sign-in/page.tsx`, `account/page.tsx` (accepts
    an optional `?state=` override across the four mock states for design review — not a live
    in-UI switcher, so it can't be mistaken for a real state selector), `trial-ended/page.tsx`,
    `privacy/page.tsx`, `terms/page.tsx`, `cookies/page.tsx`. `account`/`sign-in` render dynamically
    (they read `searchParams`); everything else prerenders statically per locale, confirmed via
    `next build`'s route table.
  - **i18n**: the old `common`/`marketing` namespaces (only ever consumed by the placeholder home
    page just replaced) were removed outright rather than left orphaned; a new `platform` namespace
    holds every string this phase introduces, in both `messages/en.json` and `messages/es.json`,
    with the exact EN/ES copy the governing spec specified verbatim. No hard-coded UI copy was
    introduced anywhere in `src/components/platform` or the new routes.
  - **Armony integration**: `src/app/[locale]/app/page.tsx` gained one import
    (`PlatformBackLink`) rendered above `<ExplorerApp />` — a thin bar styled with Armony's OWN
    existing `border`/`foreground-muted` tokens (not `.ona-shell`'s palette), linking to ONA Home.
    `ExplorerApp.tsx` itself, its reducer, and every domain module are byte-for-byte untouched
    (confirmed via `git diff` before commit).
  - **Deliberately not implemented, per the phase's own explicit scope boundary**: Supabase, real
    Google/email authentication, Stripe, real subscriptions/billing/webhooks, transactional email,
    anti-abuse systems, a production database, a real 72-hour trial timer, additional music apps,
    "Coming soon" cards, and MIDI export. The sign-in screen's two buttons and a tool card's "Try
    now" link do navigate to `/account` as a structural placeholder for "where the user lands after
    a real sign-up," carrying an unused `?from=` app id through the chain — but no session, cookie,
    or account record is ever created; reloading `/account` directly shows the same mock trialing
    state to anyone.

  Verified 2026-08-14: `npm run test` (676 tests, unchanged — no domain code touched), `next
  typegen && tsc --noEmit`, `npm run lint`, `npm run build` all pass with zero errors/warnings.
  Live-browser verification (Playwright, desktop 1440×900 + mobile 390×844, English + Spanish):
  zero console/page errors across home, `/app`, sign-in, all four account states (via `?state=`),
  trial-ended, and `/privacy`; the mobile menu opens/closes and lists Apps/Pricing/Sign in/Try for
  free; the header's "Apps" link scroll-anchors correctly to the Tools section under the sticky
  header (`scroll-mt-20` clears it); the locale switcher persists across navigation (visiting
  `/account` after `/es` correctly still renders Spanish, confirming the governing spec's "selected
  locale persists through platform navigation" requirement); Armony's `/app` route renders fully
  intact on both desktop and mobile with the new back-link occupying a single unobtrusive row above
  the existing toolbar, crowding nothing.
- **P0 follow-up: real ONA logo + Armony-map-style card thumbnail.** Two narrowly-scoped fixes once
  the approved logo image was supplied, with everything else from P0 (structure, copy, routes,
  pricing, auth mocks, EN/ES architecture, Armony) left untouched.
  - **Real logo asset processing.** The supplied source image (light background, black ink) was
    processed once, offline, into `public/brand/ona-logo-full.png` (the full lettering+waveform
    lockup) and `public/brand/ona-mark-compact.png` (a waveform-only crop of the SAME asset) — both
    transparent PNGs recolored to the platform's warm-ivory token (`#F2F0E9`), via a luminance-based
    alpha extraction (background→transparent, ink→ivory) with no retracing or redrawing of the
    lettering itself, then palette-quantized for file size. `src/components/platform/Logo.tsx` was
    rewritten from a temporary `<span>` wordmark to a `next/image`-based component with a `variant`
    prop (`"full" | "compact"`) and a `heightPx` prop that derives the rendered width from the
    asset's real aspect ratio — every existing call site (`LogoLink` in `PlatformHeader`/
    `AuthShell`, `Logo` in `PlatformFooter`) now renders the approved mark with no other changes
    needed, confirming the original "modular, easy to replace later" design held. The compact
    waveform-only mark is wired into the component API but not currently used anywhere — the full
    lockup read clearly enough at real header/footer scale in live-browser testing that no call
    site needed the fallback.
  - **The stray circular "N" was Next.js's own dev indicator, not application code.** Confirmed by
    running a PRODUCTION build (`next build && next start`, not `next dev`) and screenshotting the
    same routes: the badge is absent. It never reaches the actual Vercel preview the user reviews
    (Vercel serves the production build), so there was nothing in this codebase to remove.
  - **Armony card thumbnail rebuilt from Armony's real map styling, not a generic diagram.**
    `src/components/platform/home/ToolCardVisual.tsx` no longer renders an unlabeled abstract
    node/star graphic — it now renders a small static excerpt of a real C-major harmonic-map state
    (center chord `C`; `Dm`/`Em`/`F`/`Am` as natural-territory neighbors, `G7` as the
    tension-territory dominant), with every node showing its real chord label. Node/edge styling
    literally reuses the same CSS custom properties `src/components/map/MapNode.tsx`/`MapEdge.tsx`
    read (`var(--color-accent)`, `var(--color-tonic)`, `var(--color-dominant)`, etc.) and the same
    territory dash-pattern convention (`territoryVisuals.ts`), so the card's colors automatically
    stay in sync with Armony's real palette — but it imports nothing from `@/domain` and does not
    mount the live `HarmonicMap` component, keeping the marketing card a cheap static SVG rather
    than a second consumer of the harmony engine.

  Verified 2026-08-14: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676,
  unchanged), `npm run build` all pass with zero errors. Live-browser verification against the
  PRODUCTION build specifically (to settle the "N" question with evidence, not assertion) —
  desktop 1440×900 + mobile 390×844, English + Spanish: zero console/page/4xx-5xx errors on `/`,
  `/es`, `/app`, `/sign-in`, `/account`; zero horizontal overflow on either viewport; the logo reads
  clearly in the header (both breakpoints), footer, sign-in card, and account page; the Armony card
  shows the real chord labels and colors described above at both desktop and mobile card widths;
  the mobile menu still opens correctly with the new logo in the header; Armony's `/app` route is
  visually identical to before this follow-up, including the still-plain-text (not image) "Volver a
  ONA"/"Back to ONA" link, which was intentionally left alone since it's styled with Armony's own
  tokens, not the ONA platform shell's.
- **P0 second follow-up: hero wave visibility, multi-territory card, mock-flow `returnTo`.** Three
  narrowly-scoped fixes; structure/copy/pricing/routes/EN-ES/Armony untouched.
  - **Hero wave: blur, not just opacity.** `HeroWaves.tsx`'s first fix attempt (raising the flat
    vector wave paths' opacity directly) was visually rejected — at an opacity high enough to be
    "clearly visible," the hard SVG edge read as a bold, poster-like graphic shape, explicitly what
    the brief called out as unwanted ("bright, neon, glossy, techy"). The shipped version instead
    wraps both wave `<svg>` layers in one `<div style={{ filter: "blur(48px)" }}>` — the same two
    accent-coloured shapes, now diffused into a soft atmospheric glow, letting opacity sit high
    enough (0.35/0.45) to be unmistakably present while the blur keeps the result feeling ambient
    rather than a bold vector illustration. Everything else about the component (the two-layer
    parallax structure, the seamless `-50%` translate loop, the global `prefers-reduced-motion`
    override) is untouched.
  - **Armony card: a real, verified 5-territory excerpt, not a hand-picked one.** The previous
    version showed one territory (natural) plus one tension chord — genuinely just "a chord
    connected to a few neighbors," not a demonstration of Armony's territory concept. The new
    `ToolCardVisual.tsx` data (F/A7/Em/Ab/A around center C) was confirmed against the ACTUAL
    domain output before being hand-placed as SVG coordinates: a throwaway Vitest test
    (`src/domain/graph/__scratch.test.ts`, written, run once via
    `npx vitest run ... --reporter=verbose`, then deleted — never committed) called the real
    `relationshipsFrom(parseChordSymbol("C"), context, 4)` and printed each edge's
    `harmonicTerritoryFor` result, so every displayed (chord, territory) pair is a genuine,
    currently-reachable relationship, not an invented one. Node placement is now intentionally
    organic/asymmetric (varying radius and angle per node, with the exploration-territory node
    pushed farthest from center to loosely echo "deeper relationship = more distant") rather than
    the previous even semicircular arc, per the brief's "should feel more organic and exploratory,
    not a symmetrical star." Three of five nodes carry a small (`fontSize 8`, ~75% opacity)
    territory-name caption in the node's own territory colour; the other two (substitution, modal
    colour) rely on colour + dash pattern alone, matching the brief's explicit permission not to
    label every territory if it would crowd the thumbnail. Styling formulas and CSS custom
    properties are unchanged from the prior pass (still no `@/domain` import at the component level
    — the domain-verification step happened offline, in a deleted scratch test, not at render time).
  - **Mock sign-in flow: `returnTo`, validated against a real allowlist.** New
    `src/platform/safeReturnTo.ts` exports `resolveSafeReturnTo(returnTo, fallback)`: the requested
    destination is checked against `new Set(platformTools.map(t => t.route))` — built from the
    SAME central tool catalogue the marketing card already reads from, so a future second app is
    automatically a valid `returnTo` target the moment it's added to `tools.ts`, with no separate
    allowlist to maintain — and only an exact match is ever returned; anything else (undefined,
    empty, an external URL, a protocol-relative `//host` path, an unrecognized internal path) falls
    back to the caller's default. `ToolCard.tsx`'s CTA changed from `?from=<tool id>` (unused by
    anything) to `?returnTo=<tool.route>` (`/sign-in?returnTo=/app` for Armony).
    `src/app/[locale]/sign-in/page.tsx` reads `returnTo`, resolves it via `resolveSafeReturnTo(...,
    "/account")`, and both mock "Continue with Google/email" `Link`s use that single resolved
    `destination` string directly — no `as any` cast needed; a plain `string` href compiles cleanly
    against next-intl's typed `Link` here, confirmed via `tsc --noEmit` before settling on this
    approach over an earlier draft that assumed (incorrectly) a cast was required. The header's
    "Sign in" link is unchanged — it still points at bare `/sign-in` with no `returnTo`, so it
    continues to resolve to the `/account` default, matching the brief's explicit CASE B
    requirement.

  Verified 2026-08-14: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676,
  unchanged — no `src/domain` file was committed with a diff; the scratch test used to verify the
  card's chord/territory data was deleted before commit), `npm run build` all pass with zero
  errors. Live-browser verification against the PRODUCTION build — desktop 1440×900 + mobile
  390×844, English + Spanish: zero console/page/4xx-5xx errors and zero horizontal overflow on
  every combination tested; the hero wave reads as a clearly-present soft glow with headline/
  subtitle fully legible in both viewports; the Armony card shows all five labeled chord nodes
  legibly at real rendered card size on both desktop and mobile. End-to-end flow verification
  clicked through the real UI rather than only inspecting generated hrefs: from `/es`, clicking
  Armony's "Try now" landed on `/es/sign-in?returnTo=%2Fapp`, and clicking the mock Google button
  from there landed on `/es/app` — Armony, still in Spanish; separately, from `/`, clicking the
  header's "Sign in" landed on `/sign-in` (no query string), and clicking the mock email button
  from there landed on `/account`. A final screenshot of `/app` after all of the above confirmed
  Armony itself unchanged.
- **P0 third follow-up: a real wave motif, section-level visual depth, a reusable app-nav
  component.** Purely visual; structure/copy/pricing/routes/auth mocks/Armony untouched.
  - **New `src/components/platform/wave/` module — the wave finally reads as a wave.** The prior
    follow-up's fix (a heavy `blur(48px)` on the hero's flat vector shapes) was itself superseded
    here: blurred that much, the shape had stopped reading as a wave at all and just looked like
    another petroleum-toned glow — exactly the complaint this pass was asked to fix.
    `wavePaths.ts` hand-authors a handful of open "crest" curves (irregular Bézier control points,
    not a repeating sine) as plain `WaveCurve` data (`{ width, height, crest }`); `fillPath()`
    derives a closed silhouette from a crest by literally appending `L width,height L0,height Z` —
    so a stroke and a fill drawn from the same curve always trace one identical line, they can
    never visually drift apart. `HeroWave.tsx` draws the primary layer as BOTH a modest translucent
    fill (`opacity 0.24`) AND a crisp brighter stroke along just the crest (`opacity 0.7`,
    `strokeWidth 2.5`) — the stroke is the actual fix: a contour line is what makes an organic
    shape unambiguously read as "a wave" rather than "a colored blob," the same reason
    line-illustration wave/mountain art works. A second, fainter (`opacity 0.14`), differently-
    shaped, fill-only layer sits behind it for depth. `SectionWave.tsx` is the reusable "large
    fragment bleeding from one edge" variant (fill-only, `side`/`opacity` props) used elsewhere on
    the page.
  - **Motion: replaced the seamless-marquee scroll with a slow independent breathe.** The previous
    `hero-wave-drift` keyframe (`translateX(0) → translateX(-50%)`, requiring each path to be
    drawn twice for a seamless loop) is gone. New `wave-drift-primary`/`wave-drift-secondary`
    keyframes (`globals.css`) each ease between the origin and a small `translate(x%, y%)` offset
    and back (`ease-in-out infinite alternate`, 26s and 34s — deliberately different so the two
    layers never move in lock-step), applied to a wrapping `<g transform-box: fill-box>` per layer
    so the percentage offsets resolve against each wave's own bounding box rather than the SVG
    viewport. Still fully neutralized by the existing global `prefers-reduced-motion` rule —
    verified via computed style (`animation-duration` collapses to ~0) rather than only visual
    inspection this time.
  - **Home sections now carry deliberately different backgrounds, per the brief's suggested
    rhythm.** `IntroSection.tsx` and `TrialSection.tsx` each gained `relative overflow-hidden` and
    one `<SectionWave>` at a LOW opacity (0.06 and 0.10 respectively) on opposite sides (`left`/
    `right`) — different enough that the two sections don't look like copies of each other.
    `ToolsCatalogue.tsx` and `PricingSection.tsx` are untouched — no wave — so the app cards and
    the Pro module stay each section's visual focus, per the brief's explicit "cleaner and calmer"
    / "calmer/darker again" guidance. `FinalCta.tsx` reuses `HeroWave` VERBATIM (not a new variant)
    specifically so the page closes by echoing the hero rather than introducing a third
    interpretation of the motif.
  - **New `AppBackToPlatform.tsx` replaces `PlatformBackLink.tsx` outright** (the old file is
    deleted, not deprecated — it had exactly one consumer). Same discreet single-link pattern as
    before, now prefixed with the real ONA logo at `variant="compact"` (the waveform-only mark,
    `heightPx={14}`) — the `full` lettering+waveform lockup was already established as illegible
    below roughly 36–40px in the earlier logo-integration pass, so this is precisely the scenario
    that variant exists for. `alt=""` on the image (the surrounding link's visible text already
    supplies the accessible name). Styling intentionally still reads from Armony's own generic
    semantic tokens (`border`, `foreground-muted`) rather than `.ona-shell` — the component is
    documented as reusable by ANY future app specifically because those token names are a
    convention every app is expected to define, not because they're borrowed from the platform
    shell. `src/app/[locale]/app/page.tsx` changes only its import and the one tag it renders;
    `ExplorerApp` and everything under `src/domain` are untouched.

  Verified 2026-08-14: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676,
  unchanged), `npm run build` all pass with zero errors. Live-browser verification against the
  PRODUCTION build — desktop 1440×900 + mobile 390×844, English + Spanish: zero console/page/
  4xx-5xx errors and zero horizontal overflow on every combination (this pass also caught and fixed
  a false-positive of its own: an earlier verification run hit stale 500s/404s from a leftover
  `next start` process still serving a now-overwritten `.next` build after a fresh `npm run build`
  — killing that process and starting clean resolved it; not a code defect). The hero wave is now
  unambiguously identifiable as a wave silhouette, not a glow, on both viewports, with headline/
  subtitle/CTA fully legible; the four backgrounded sections (hero, intro, trial, final CTA) are
  each visually distinct from one another rather than repeating one treatment, while tools/pricing
  remain deliberately plain. Clicked "Back to ONA" from `/es/app` and confirmed it lands on `/es`
  — locale preserved end-to-end, not just by inspecting the generated href. A final screenshot of
  `/app` (desktop + mobile, EN + ES) confirmed Armony itself pixel-unchanged apart from the
  back-link swap.
- **P0 fourth follow-up: the waves finally read as waves, not hills.** User visual review of the
  third follow-up's output found the geometry itself insufficient — the hero was "closest but could
  flow more," the introduction wave "almost invisible," the trial wave "reads like a hill/blob."
  Diagnosis: every curve so far had at most ONE rise-and-fall across its width — geometrically
  indistinguishable from a hill/dome regardless of colour or opacity — and `SectionWave` rendered
  fill only, with no crest stroke, so its shape had no defined edge to read at all. Both root
  causes were fixed in `src/components/platform/wave/`, not papered over with more opacity:
  - **New curve geometry, validated before being committed.** `wavePaths.ts`'s `HERO_PRIMARY`/
    `HERO_SECONDARY` were rewritten and two brand-new curves added — `INTRO_WAVE`, `TRIAL_WAVE` —
    each with 2-3 irregular, unevenly-spaced asymmetric crests (never a repeating sine — every hump
    has different width/height than its neighbors, avoiding both the "hill" read and the
    "equalizer" read). The old shared `EDGE_FRAGMENT` (one gentle rise, mirrored between Intro and
    Trial) is gone — the two sections now each have their own distinct shape, matching the brief's
    explicit "not a duplicate" requirement. Before committing to control-point values, several
    candidate curves were rendered in an isolated static HTML page (flat stroke/fill only, no app
    chrome) via a throwaway Playwright screenshot pass — never added to the repo — specifically so
    the shape itself could be judged without the confound of section context; the current curves
    are the ones that read unambiguously as "a wave" in that isolated test.
  - **`SectionWave.tsx` gained a crest stroke.** It now takes an explicit `curve: WaveCurve` prop
    (previously hardcoded to `EDGE_FRAGMENT`) and renders BOTH a translucent fill and a stroke
    along the crest — opacity `min(fillOpacity × 3, 0.5)` — the same "fill + brighter contour"
    formula `HeroWave` already used for the hero. This is the second half of the actual fix: a
    filled blob without a defined edge cannot read as "a wave" no matter how visible its colour is.
  - **Motion gained a very subtle scale breathe.** `wave-drift-primary`/`wave-drift-secondary`
    (`globals.css`) now animate `scale(1) → scale(1.015)`/`scale(1.02)` alongside the existing
    slow `translate`, adding a touch of organic "alive" quality per the brief's "slight
    breathing/scale variation" suggestion. Timing (26s/34s, `ease-in-out infinite alternate`)
    unchanged — already within the brief's suggested 20-40s range.
  - **`HeroWave` gained a `flip` prop; Final CTA now uses it.** Rather than rendering the exact
    same unflipped hero composition a second time (assessed as too repetitive per the brief's own
    "inspect whether it feels too repetitive" instruction), `FinalCta.tsx` now passes `flip` —
    mirrors the whole SVG group horizontally via `-scale-x-100` on the purely decorative
    `aria-hidden` wrapper (the headline/CTA are siblings, unaffected) — same curves, same design
    family, visually distinct enough to read as an echo rather than a copy.
  - **Section wave opacity raised only AFTER the geometry fix**, not instead of it — Intro's fill
    went from 0.06 to 0.12, Trial's from 0.10 to 0.16. Raising opacity on the OLD single-rise
    shapes would have produced a more visible hill; sequencing the fix this way (shape first,
    then intensity) was deliberate, per the brief's own "do not simply increase opacity... improve
    the actual geometry."

  Verified 2026-08-14: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676,
  unchanged — this pass touches only files under `src/components/platform/wave/`,
  `src/components/platform/home/`, and `globals.css`), `npm run build` all pass with zero errors.
  Live-browser verification against the PRODUCTION build — desktop 1440×900 + mobile 390×844,
  English + Spanish: zero console/page/4xx-5xx errors and zero horizontal overflow. Re-judged
  against the brief's own 9 review questions rather than assuming the geometry fix was sufficient
  just because it matched the instructions: the hero, introduction, trial, and final-CTA waves now
  ALL show multiple visible crests/troughs and read unambiguously as waves, not hills/blobs; the
  four are recognizably one family (shared curve style, petroleum colour, fill+stroke formula) yet
  distinct from each other in crest count/scale/crop/opacity; text stayed fully legible everywhere
  a wave crosses behind it, confirmed via pixel-level close-up crops of the intro and trial
  sections specifically, not just the full-page screenshot; `prefers-reduced-motion` reconfirmed
  via computed style (`animation-duration` collapses to ~0 on both wave layers). A final `/app`
  screenshot (desktop + mobile, EN + ES) confirmed Armony itself untouched — this pass modified no
  file outside the wave/Home-background system.

- **ONA Functional Phase 1 (2026-08-14) — real auth/trial/entitlements, minimal `platform_access`
  table instead of the fuller sketched `entitlements` table.** All of `src/platform/mockAccount.ts`
  is deleted; auth, the 72-hour trial, and `/app` protection are now real (`@supabase/ssr`, a DB
  trigger, RLS) — see the "Entitlements" and "Data model" sections above for the shape, and
  `docs/roadmap.md`'s matching deviations entry for the product-level rationale (notably: Google +
  passwordless email only, no password lifecycle). Two implementation notes worth recording here
  specifically as architecture decisions:
  - **`unstable_rethrow` in `getPlatformAccess`/`refreshSupabaseSession`.** Both wrap their
    Supabase calls in try/catch so a missing/unreachable Supabase config degrades to "visitor is
    signed out" rather than crashing `next build`'s prerendering or the whole site. Without
    `unstable_rethrow(error)` as the first line of the catch block, Next's own internal
    control-flow signals (the dynamic-rendering bailout `cookies()` throws during static
    generation, plus `redirect()`/`notFound()`) get swallowed and logged as if they were genuine
    failures — `unstable_rethrow` lets those pass through untouched so only a real Supabase/env
    error is ever caught.
  - **`src/proxy.ts` composes two middlewares instead of the usual one-middleware-owns-the-response
    pattern.** `refreshSupabaseSession(request)` (`src/platform/supabase/middleware.ts`) returns a
    list of cookies to set rather than owning a `NextResponse`, so it can be layered onto whatever
    response next-intl's locale-routing middleware produces (pass-through or redirect) — necessary
    because Supabase's session-refresh needs to run in the same middleware pass as locale routing,
    but next-intl's `createMiddleware` already owns response construction.

- **ONA Functional Phase 1 hardening pass (2026-08-14) — publishable-key migration, pure `/app`
  access decision.** After the real Supabase project was wired up in Production, its dashboard
  labeled the low-privilege public key "Publishable key" rather than the "anon key" this phase's
  code originally read, which surfaced as a startup config error. Fixed by making
  `src/platform/supabase/env.ts`'s `getSupabasePublicEnv()` the single place any Supabase client
  reads env vars from — it now reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exclusively;
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` has zero effect anywhere in the app (verified by
  `src/platform/supabase/env.test.ts`, including a case that sets the legacy variable and confirms
  it's ignored). No RLS/DB/service-role change — the underlying Supabase key itself didn't change,
  only which env var name the app looks for. Also added `src/domain/entitlements/appAccess.ts`
  (`decideAppAccess`) — a small pure function factoring `/app`'s three-way redirect decision
  (sign-in / trial-ended / allow) out of `app/page.tsx` so it's unit-testable without mocking
  Next.js or Supabase; the actual redirect wiring and production behavior are unchanged.

- **ONA Functional Phase 2 (2026-08-16) — Stripe Pro subscriptions.** Extends the tri-state
  `EntitlementStatus` (`trialing`/`active`/`expired`) with a real Stripe-backed `"active"` (Pro)
  instead of Phase 1's reserved-but-unused value; the reserved `"past_due"`/`"canceled"` literals
  that used to live directly on `EntitlementStatus` are removed from that type — they're modeled
  properly now, as a separate `StripeSubscriptionStatus` union in
  `src/domain/entitlements/billing.ts`, since Stripe's own subscription-status vocabulary is richer
  than the three-state platform-level access this app actually needs to render. See the
  "Entitlements"/"Data model" sections above for the full shape and `docs/stripe-billing-setup.md`
  for the required external Stripe/Supabase setup. Two implementation notes worth recording here:
  - **`import "server-only"` on the new secret-touching modules, and its Vitest workaround.**
    `src/platform/stripe/{env,client}.ts` and `src/platform/supabase/admin.ts` all import
    `"server-only"` — a marker package that unconditionally throws when resolved outside a
    bundler's `react-server` condition, turning an accidental client-bundle import into a
    build-time error. Since Vitest doesn't set that condition, importing these modules directly in
    a test throws; the fix (used in `src/platform/stripe/env.test.ts` and
    `syncSubscription.test.ts`) is `vi.mock("server-only", () => ({}))` before importing the module
    under test — the standard pattern for unit-testing a server-only-guarded module without
    weakening the guard itself. Phase 1's Supabase `env.ts`/`client.ts`/`server.ts` don't use this
    guard because `env.ts` deliberately serves both the browser AND server Supabase clients (it
    only ever holds public values) — the guard is new to Phase 2's genuinely secret-only modules.
  - **A caught bug: the checkout route crashed with a raw 500 instead of failing closed.** During
    verification, POSTing to `/api/stripe/checkout` without Supabase env configured threw an
    unhandled exception (`createSupabaseServerClient()`'s own `getSupabasePublicEnv()` throw was
    never caught in the route) instead of the intended 401. Fixed by wrapping the
    user-authentication lookup in its own try/catch that treats any failure as unauthenticated —
    matching `getPlatformAccess()`'s own established fail-closed pattern — and by wrapping the
    subsequent `platform_billing` pre-check read the same way (falling back to "no existing
    customer on file" rather than crashing). Caught via manual smoke testing against a local dev
    server with no Stripe/Supabase env vars set, not by an automated test — recorded here as a
    concrete example of why that manual pass matters even with heavy unit-test coverage elsewhere.
