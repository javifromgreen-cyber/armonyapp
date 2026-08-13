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
  /app/[locale]             Next.js App Router: marketing routes + /app (the product) routes, one locale segment
                            globals.css (Tailwind entry + dark-first design tokens) lives in src/app
  /components               presentational + composed UI components (React), consume /domain only through hooks/adapters
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

**Revised R1** — replaces the previous permanent `plan: "free" | "pro"` model
(`docs/product-spec.md` §25/§26). There is no permanent Free tier and no Lifetime license; access
is governed by the 72-hour trial and a single Annual license.

A single module (`src/domain/entitlements`) maps an account's entitlement **status** to a typed
capability object:

```ts
type EntitlementStatus = "trialing" | "active" | "expired"; // + reserved for later: "past_due" | "canceled"

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

Server-side, the user's entitlement status is derived from `trial_started_at` (set at registration)
and the `subscriptions`/`entitlements` table (updated only by verified Stripe webhooks), never from
client state. UI reads entitlements through a single hook (`useEntitlements()`) that wraps this —
no `user.plan === "pro"` or ad-hoc trial-timer checks scattered through components.

## Data model (initial, Supabase/Postgres)

- `profiles` — id (references `auth.users`), display_name, primary_instrument, main_goal,
  locale, marketing_consent, created_at, `trial_started_at`.
- `entitlements` — user_id, status (`trialing` | `active` | `expired`, reserved: `past_due` |
  `canceled`), current_period_end (nullable), stripe_customer_id, stripe_subscription_id,
  updated_at. **Revised R1**: the previous `plan` (`free` | `pro_annual` | `pro_lifetime`) column
  is replaced by `status` above — there is only one paid product (Annual), so a `plan` column
  distinguishing multiple paid tiers no longer applies.
- `projects` — id, user_id, name, key_context (nullable — no locked tonal key; this is the TONAL
  "free mode" concept from `docs/product-spec.md` §5/§6, unrelated to account entitlement status),
  bpm, time_signature, instrument, created_at, updated_at.
- `progression_chords` — id, project_id, chord_symbol, duration_beats, position, created_at.
- `stripe_webhook_events` — event_id (unique, for idempotency), type, processed_at.

RLS: every table except `stripe_webhook_events` is scoped `user_id = auth.uid()`. Webhook table is
service-role only.

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
