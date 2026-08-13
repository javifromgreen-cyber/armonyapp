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
- Harmonic "Zoom" (1–4) is harmonic depth (which relationship types are shown), not visual scale,
  and is cumulative (Zoom N = Zoom 1..N's families combined). Every graph edge must carry a real
  musical relationship — never add chords just to fill space. **Within an active depth, every
  valid modeled relationship must stay reachable — ranking may reorder, group, or visually
  emphasize possibilities, but must never delete one from what the user can reach** (see
  `docs/product-spec.md` §8/§30, revised R1; implemented in Phase R3).
- Three distinct user actions must stay distinct in code and UI: selecting a chord, recentring the
  map on a chord, and adding a chord to the progression. Selection must never mutate the
  progression.
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
