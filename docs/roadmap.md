# Roadmap / Phase Checklist

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done and verified (tests + typecheck +
lint + build passing).

At the end of every phase: run tests, typecheck, lint, build; fix errors; confirm no regressions;
record notable decisions here or in `architecture.md`.

## Phase 1 — Architecture and core infrastructure
- [ ] Next.js + TypeScript (strict) + Tailwind scaffold
- [ ] Repository layout per `architecture.md`
- [ ] next-intl wired with `en`/`es` namespaces, no hard-coded UI strings
- [ ] Base dark-first design tokens (Tailwind theme)
- [ ] Vitest configured for `/src/domain`
- [ ] ESLint + TypeScript strict mode clean
- [ ] `.env.example`, README
- [ ] CI-equivalent local scripts: `lint`, `typecheck`, `test`, `build`

## Phase 2 — Music theory engine + tests
- [ ] notes, intervals, chords, keys modules
- [ ] Chord catalogue from spec §10
- [ ] Enharmonic spelling rules
- [ ] Transposition
- [ ] Unit tests per `music-engine.md`

## Phase 3 — Harmonic graph engine + Zoom 1–4 + tests
- [ ] harmony module (functions, secondary dominants, borrowed chords, substitutions)
- [ ] graph module (node/edge generation, relationship metadata)
- [ ] Zoom 1–4 classification
- [ ] Tests per relationship type and zoom level

## Phase 4 — Core harmonic map UI
- [ ] Custom map renderer (current chord + relevant neighbors, progressive expansion)
- [ ] Select vs recenter vs add-to-progression as distinct actions
- [ ] Contextual side panel (chord info, relationship explanation)
- [ ] Zoom control gated by entitlements (Free = 1–2)

## Phase 5 — Progression builder
- [ ] Add/remove/reorder chords, durations, BPM, time signature
- [ ] Transposition of full progression
- [ ] Persistent bottom strip UI

## Phase 6 — Audio
- [ ] Tone.js setup, neutral harmonic playback
- [ ] Instrument/voicing playback
- [ ] Progression playback with transport

## Phase 7 — Piano representation
- [ ] Keyboard UI, root position + inversions/voicings, Free/Pro catalogue split

## Phase 8 — Guitar representation and voicing engine
- [ ] Fretboard/chord diagram, TAB, finger numbers
- [ ] Voicing generation + playability ranking, automated tests
- [ ] Free (~2-3 voicings) vs Pro (expanded) catalogue

## Phase 9 — Bass representation
- [ ] Bass fretboard, chord tones, one pattern (Free) vs multiple (Pro)

## Phase 10 — Authentication and project persistence
- [ ] Supabase auth: email/password, verification, reset; Google OAuth
- [ ] Onboarding (primary instrument, main goal)
- [ ] Project CRUD, RLS

## Phase 11 — Free/Pro entitlement system
- [ ] Central entitlements module + `useEntitlements()`
- [ ] Free project limit (3) enforced server-side

## Phase 12 — Stripe Annual + Lifetime
- [ ] Checkout for annual + lifetime
- [ ] Webhook handling, idempotency, entitlement sync

## Phase 13 — Complete English/Spanish UI
- [ ] Full copy translated, no missing keys

## Phase 14 — Marketing website
- [ ] Home, Features, Pricing, FAQ, Login, Register, Privacy, Terms

## Phase 15 — Responsive UX, accessibility, testing, production polish
- [ ] Mobile/tablet purpose-built layouts
- [ ] Accessibility pass
- [ ] Playwright e2e for core flows
- [ ] Final production build verification

## Deviations / notable decisions log

(none yet)
