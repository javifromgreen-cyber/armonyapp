# Armony — persistent project rules

@AGENTS.md

Full spec: `docs/product-spec.md`. Architecture: `docs/architecture.md`. Music engine design:
`docs/music-engine.md`. Phase status: `docs/roadmap.md`. Read the relevant doc before large
changes — do not re-derive product decisions from memory.

## Identity (never drift from this)

Armony is an interactive harmonic exploration environment: EXPLORE → UNDERSTAND → HEAR → PLAY →
COMPOSE, always combined in one interaction, never split into separate modes. It is not a chord
generator, chord dictionary, Tonnetz, theory course, DAW, or AI chatbot. "Google Maps for harmony"
is a navigation metaphor only — the UI must not look like a geographic map. Armony's purpose is
FAST HARMONIC EXPLORATION AND UNDERSTANDING — finding, comparing, hearing, and playing chords that
work next, then quickly building/auditioning a progression from that route. It is not a rhythmic
composition/sequencing tool (no BPM, time signature, or per-chord duration UI — Phase R3.4, see
`docs/product-spec.md` §16/§18).

**Platform positioning (Phase R3.4, documentation only — does not change Armony itself):** Armony
is the FIRST app inside a future multi-app platform for music composition and understanding. Future
mini-apps are not designed/named/scoped here — never invent one. The future platform has no decided
brand name — refer to it generically as "the platform," never assume "Armony" becomes that name.
See `docs/product-spec.md` §0/§2.

## Hard architectural rules

- `src/domain/**` is framework-free TypeScript: no React, Next.js, Supabase, or Stripe imports.
  UI and persistence adapt to the domain layer, never the reverse.
- Never bury harmonic/music-theory rules inside React components.
- No giant catch-all files (no single `musicTheory.ts`) — split by music domain per
  `architecture.md`.
- Entitlements are centralized (future: `src/domain/entitlements`, not yet built — see Scope
  boundary below); never scatter `if (user.plan === "pro")` or ad-hoc trial-timer checks through
  the app, and never model entitlement as per-app flags (`armony_pro`, `future_app_2_pro`, ...).
  Gate by named capability (`canUseApp`, `canSaveProjects`, `canExport`) derived from a single
  PLATFORM-LEVEL entitlement status (`trialing`/`active`/`expired`), not by plan string. There is
  no permanent Free/Pro tier and no Lifetime license — see `docs/product-spec.md`
  §9/§19/§20/§25/§26 (revised R1, then R3.4). **Commercial model (Phase R3.4)**: register → 72-hour
  trial of the FULL PLATFORM (every app, not just Armony) → annual **Platform Pro** required after,
  granting access to ALL platform apps (present and future) as one subscription — never a
  per-app/per-feature purchase. Account/data is never deleted on `expired`. **No item-level "Pro"
  gating exists anywhere in Armony** — individual voicings/shapes/patterns/instruments/Depth
  levels/relationships are never commercially badged, hidden, or locked (Phase R3.4 removed the
  last remaining visible per-voicing "Pro" badge — see `docs/roadmap.md`'s R3.4 entry); "Pro"
  means the account's platform-wide entitlement, nothing narrower. **Scope boundary**:
  registration/login/account UI/trial countdown/Supabase/Stripe/billing/entitlement enforcement are
  NOT implemented yet — they belong to a future shared "Platform Foundation" phase, built once for
  every app rather than per app.
- Harmonic "Zoom"/Depth (1–4) is harmonic depth (which relationship types are shown), not visual
  scale, and is cumulative (Zoom N = Zoom 1..N's families combined). Every graph edge must carry a
  real musical relationship — never add chords just to fill space. **Within an active depth, every
  valid modeled relationship must stay reachable — ranking may reorder, group, or visually
  emphasize possibilities, but must never delete one from what the user can reach** (see
  `docs/product-spec.md` §8/§30, revised R1; implemented in Phase R3). **Harmonic Territory**
  (natural/tension/modal colour/substitution/exploration — Phase R3.2) is a SEPARATE, beginner-
  facing grouping by the musical FUNCTION of a relationship (`harmonicTerritoryFor`, layered on top
  of the already-reviewed `harmonicCharacterFor`, never re-deriving from `relationshipType`/depth
  directly). Territory and Depth are independent axes — territory drives the map's primary visual
  identity and sector grouping; depth stays a small secondary badge only, never expressed as
  radial position or territory colour. Territory is data-driven and complete (union of all
  territories == full outgoing set, no chord in two territories, empty territories simply
  omitted) — see `docs/product-spec.md` §8/§30, revised R3.2.
- Two distinct user actions must stay distinct in code and UI: inspecting a chord silently
  (hover/keyboard-focus — informational only, never sounds anything, never moves the map, never
  sets preview state) and navigating to a chord. **Revised R3.2, then R3.3** (R3.2 reintroduced a
  two-step interaction on top of R3.1's foundations, superseding R3.1's own
  single-click-does-everything model; R3.3 changed what CONFIRMING does to the progression — see
  below): the FIRST click/tap/Enter on a candidate PREVIEWS it — cancels any in-flight audio, plays
  the confirmed path plus the candidate from the beginning, shows layered info in the panel — but
  does not navigate, recenter, or touch history/progression. Switching preview to a different
  candidate cancels the old audition and starts a new one, still without touching confirmed
  history. The SECOND activation of the SAME already-previewed candidate CONFIRMS it — commits it
  to navigation history, becomes the new current chord, clears preview, recenters the map,
  regenerates outgoing options, and (Revised R3.3) automatically appends it to the progression,
  exactly once — but plays no audio itself (already heard during preview). This is persistent UI
  state, never a double-click/timer — arbitrary time may elapse between the two activations. Map/
  path audio is always cumulative: replayed from the first chord of the CONFIRMED path (plus the
  active preview candidate when previewing), never an arbitrary append-only or truncated window;
  only one audition may exist at a time, and every new preview/Back/replay cancels all pending
  future notes. Navigation history is kept internally (Back, contextual ranking) but must never
  render as a long visible chain that could be mistaken for an authored progression — because
  (Revised R3.3) it IS the progression now — see `docs/product-spec.md` §7/§16/§30 for the full
  revision.
- **The progression is the confirmed exploration path — never a second, independently-edited list**
  (Phase R3.3, simplified further R3.4, `docs/product-spec.md` §16, revised): `Progression.items`
  is derived (a pure projection, see `src/domain/progression/fromNavigationPath.ts`) from
  `navPath.steps`, never imperatively appended/removed by a separate "Add to progression" action,
  which no longer exists. Previewing a candidate never touches it; confirming appends exactly once;
  Back removes exactly the corresponding item and never removes the starting/root chord; changing
  the starting harmonic context (the top-left control) resets it to just the new root. Manual
  per-item reorder/remove and whole-progression transpose are REMOVED, not merely hidden — they had
  no coherent meaning once the progression's order/identity is derived from navigation rather than
  independently editable (`docs/product-spec.md` §17, revised). **Revised R3.4**: `Progression`/
  `ProgressionItem` carry NO BPM, time signature, or per-item duration at all anymore — Armony is a
  harmonic-route audition tool, not a rhythmic composition tool (`docs/product-spec.md` §16). The
  bottom progression UI shows ONLY the confirmed chord list plus one Play control; a chord card
  shows the chord name only, nothing else. Progression playback uses the same simple, fixed,
  deterministic per-chord pacing "Hear Path" already used — no tempo intelligence.
- **One global instrument selection drives all instrument-aware audio and the side panel's
  execution representation** (Phase R3.3, `docs/product-spec.md` §18/§30): a single
  `InstrumentName` (`"piano" | "guitar" | "bass"`, `src/domain/instruments/instrumentName.ts`) state
  lives once, in the toolbar's `InstrumentSelector` — never duplicated in the side panel. It
  controls BOTH map/path audition (preview, "Hear Path", current-chord replay, "Hear this chord
  only" — all through that instrument's real sampler and existing voicing/pattern catalogue, reused
  via `src/audio/instrumentVoicing.ts`, never a new audio engine) AND which of Piano/Guitar/Bass the
  side panel renders. Switching it is a pure preference change: it must never touch the current
  chord, confirmed path, preview candidate, key/context, ranking, or the progression. Distinct from
  "Hear this voicing"/"Hear this pattern", which always reproduces the EXACT displayed
  voicing/pattern (unchanged since Phase R2) rather than the representative default the
  global-instrument audition uses.
- No hard-coded user-facing copy in components — use the `next-intl` message namespaces
  (`en`/`es`). Adding a language later must not require refactoring components.
- No runtime LLM dependency for product features.
- Never trust client-side payment/entitlement state — entitlements are written server-side only,
  from verified Stripe webhooks.

## Workflow

- Work in the phases defined in `docs/roadmap.md`. As of Phase R3.4, Armony's own standalone
  product experience is considered functionally closed for now — do not add new Armony features
  unless fixing a genuine bug. Future work moves toward a shared "Platform Foundation" (account/
  auth, the 72-hour full-platform trial, platform-wide entitlement, project persistence, annual
  Platform Pro billing — see `docs/roadmap.md`'s "Roadmap After Armony") and, later, individually-
  designed future mini-apps — neither begins until explicitly requested. Don't jump ahead to
  later-phase functionality (MIDI export, voice-leading optimisation, arrangement/sections, PDF/TAB
  export before Phase R4, etc. — see product-spec §32, §33) unless explicitly asked.
- At the end of each phase: run tests, typecheck, lint, build; fix failures; update
  `docs/roadmap.md` status before moving on. Don't build on a known-broken foundation.
- When uncertain about a music-theory rule: don't guess — write the rule down explicitly, add a
  test, and note the assumption in `docs/music-engine.md` if it's non-obvious.
- Update `docs/product-spec.md` in the same change if an implementation decision changes product
  scope, and log the deviation in `docs/architecture.md`.
