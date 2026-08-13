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
    Hear Path always uses a fixed quick per-chord gap (exploratory pacing, instrument-aware since
    this same phase) while Progression Play uses real BPM/time-signature/per-item-duration timing
    (`buildProgressionSchedule`) — a quick route-check vs. a tempo-accurate performance of the same
    chords, genuinely different purposes, not redundant.
    interaction changes; no new UI system was introduced.
