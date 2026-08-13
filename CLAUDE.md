# Armony — persistent project rules

@AGENTS.md

Full spec: `docs/product-spec.md`. Architecture: `docs/architecture.md`. Music engine design:
`docs/music-engine.md`. Phase status: `docs/roadmap.md`. Read the relevant doc before large
changes — do not re-derive product decisions from memory.

## Identity (never drift from this)

Armony is an interactive harmonic exploration environment: EXPLORE → UNDERSTAND → HEAR → PLAY →
COMPOSE, always combined in one interaction, never split into separate modes. It is not a chord
generator, chord dictionary, Tonnetz, theory course, DAW, or AI chatbot. "Google Maps for harmony"
is a navigation metaphor only — the UI must not look like a geographic map.

## Hard architectural rules

- `src/domain/**` is framework-free TypeScript: no React, Next.js, Supabase, or Stripe imports.
  UI and persistence adapt to the domain layer, never the reverse.
- Never bury harmonic/music-theory rules inside React components.
- No giant catch-all files (no single `musicTheory.ts`) — split by music domain per
  `architecture.md`.
- Entitlements are centralized in `src/domain/entitlements`; never scatter
  `if (user.plan === "pro")` or ad-hoc trial-timer checks through the app. Gate by named
  capability (`canUseApp`, `canSaveProjects`, `canExport`) derived from entitlement status
  (`trialing`/`active`/`expired`), not by plan string. There is no permanent Free/Pro tier and no
  Lifetime license — see `docs/product-spec.md` §9/§19/§20/§25/§26 (revised R1).
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
- Three distinct user actions must stay distinct in code and UI: inspecting a chord silently,
  navigating to a chord, and adding a chord to the progression. Adding to the progression always
  stays a fully separate, explicit action — never triggered by inspecting or navigating.
  **Revised R3.2** (reintroducing a two-step interaction on top of R3.1's foundations, superseding
  R3.1's own single-click-does-everything model): hover/keyboard-focus is purely silent,
  informational preview — it never sounds anything and never moves the map. The FIRST
  click/tap/Enter on a candidate PREVIEWS it — cancels any in-flight audio, plays the confirmed
  path plus the candidate from the beginning, shows layered info in the panel — but does not
  navigate, recenter, or touch history/progression. Switching preview to a different candidate
  cancels the old audition and starts a new one, still without touching confirmed history. The
  SECOND activation of the SAME already-previewed candidate CONFIRMS it — commits it to
  navigation history, becomes the new current chord, clears preview, recenters the map, regenerates
  outgoing options — but plays no audio itself (already heard during preview). This is persistent
  UI state, never a double-click/timer — arbitrary time may elapse between the two activations.
  Map/path audio is always cumulative: replayed from the first chord of the CONFIRMED path (plus
  the active preview candidate when previewing), never an arbitrary append-only or truncated
  window; only one audition may exist at a time, and every new preview/Back/replay cancels all
  pending future notes. Navigation history is kept internally (Back, contextual ranking) but must
  never render as a long visible chain that could be mistaken for an authored progression — see
  `docs/product-spec.md` §7/§30 for the full revision.
- No hard-coded user-facing copy in components — use the `next-intl` message namespaces
  (`en`/`es`). Adding a language later must not require refactoring components.
- No runtime LLM dependency for product features.
- Never trust client-side payment/entitlement state — entitlements are written server-side only,
  from verified Stripe webhooks.

## Workflow

- Work in the phases defined in `docs/roadmap.md` (now including refinement phases R1–R4 before
  the infrastructure phases 10A/10B/11/12). Don't jump ahead to later-phase functionality (MIDI
  export, voice-leading optimisation, arrangement/sections, PDF/TAB export before Phase R4, etc. —
  see product-spec §32, §33) unless explicitly asked.
- At the end of each phase: run tests, typecheck, lint, build; fix failures; update
  `docs/roadmap.md` status before moving on. Don't build on a known-broken foundation.
- When uncertain about a music-theory rule: don't guess — write the rule down explicitly, add a
  test, and note the assumption in `docs/music-engine.md` if it's non-obvious.
- Update `docs/product-spec.md` in the same change if an implementation decision changes product
  scope, and log the deviation in `docs/architecture.md`.
