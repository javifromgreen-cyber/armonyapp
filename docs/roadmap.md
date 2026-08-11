# Roadmap / Phase Checklist

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done and verified (tests + typecheck +
lint + build passing).

At the end of every phase: run tests, typecheck, lint, build; fix errors; confirm no regressions;
record notable decisions here or in `architecture.md`.

## Phase 1 — Architecture and core infrastructure
- [x] Next.js + TypeScript (strict) + Tailwind scaffold
- [x] Repository layout per `architecture.md`
- [x] next-intl wired with `en`/`es` namespaces, no hard-coded UI strings
- [x] Base dark-first design tokens (Tailwind theme, `.light` reserved for future light mode)
- [x] Vitest configured for `/src/domain` (passes with 0 tests until Phase 2 adds the engine)
- [x] ESLint + TypeScript strict mode clean
- [x] `.env.example`, README
- [x] CI-equivalent local scripts: `lint`, `typecheck`, `test`, `build`

Verified 2026-08-11: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` all pass;
manual check of `/`, `/es`, `/app`, `/es/app` on a production server returned 200 with correctly
localized hero copy. Marketing home and `/app` are intentionally minimal placeholders — real UI
lands in Phase 4 (map) and Phase 14 (marketing site).

## Phase 2 — Music theory engine + tests
- [x] notes, intervals, chords, keys modules
- [x] Chord catalogue from spec §10 (all 17 qualities)
- [x] Enharmonic spelling rules (context-driven via scale degree, never sharps-only)
- [x] Transposition (note-level and chord-level, including the tritone edge case)
- [x] Unit tests per `music-engine.md`

Verified 2026-08-11: `npm run test` (80 tests, 5 files), `typecheck`, `lint`, `build` all pass.
Ran the `music-theory-review` skill against the new code before marking this phase done; it found
a real bug (tritone transposition wasn't invertible — `transposeNote(transposeNote(C,6),-6)` gave
B# instead of C) and a test-coverage gap (natural-minor diatonic chords were unasserted). Both
fixed; see "Documented assumptions" in `docs/music-engine.md` for the resulting tritone-direction
rule, the diminished-7th double-flat spelling, and the natural-minor-vs-harmonic-minor scope note.

## Phase 3 — Harmonic graph engine + Zoom 1–4 + tests
- [x] harmony module (function classification, functional-minor overlay, 14 relationship families)
- [x] graph module (query API: `relationshipsFrom`, `relationshipsAtDepth`, `relationshipsBetween`)
- [x] Zoom 1–4 classification (fixed per family, documented in `music-engine.md`)
- [x] Tests per relationship type and zoom level, incl. negative/exclusion cases and a second
      major/minor key pair (G major, E natural minor) to catch mode-invariance bugs

Verified 2026-08-11: `npm run test` (183 tests, 21 files), `typecheck`, `lint`, `build` all pass.
Ran `music-theory-review` twice (once mid-implementation on the first draft, once on the settled
design) — caught and fixed 6 real issues before considering the phase done: three families
(`borrowed`/`chromaticMediant`/`nearbyKey`) independently rediscovering the same target chord under
different labels; two natural-minor-specific mathematical coincidences (V7/III ≡ diatonic bVII7,
and the leading-tone dim7 ≡ the bVII→i passing-diminished chord) that would have shown duplicate
edges; tritone substitution using a generic +6-semitone spelling (C#7) instead of the conventional
bII7-of-resolution-target spelling (Db7); and the tonic-anchored families (relative,
functionalDominant, borrowed, nearbyKey, distantKey) failing to fire from Cmaj7 because they
checked exact chord identity instead of root. UI work (Phase 4) intentionally not started — see the
report delivered alongside this commit for full architecture, relationship-type, and Zoom-rule
detail; per explicit instruction this phase stops here for review before Phase 4 begins.

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
