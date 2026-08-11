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
- [x] harmony module (function classification, functional-minor overlay, 14 relationship-family
      generator functions producing 15 distinct `RelationshipType` tags — `functionalDominantRelationships`
      alone emits both `functionalDominant` and `leadingToneDiminished`)
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

**Correctness pass 2026-08-11 (user review):** found root-only classification going one step too
far — a chord whose ROOT happens to equal the tonic (e.g. C7 in C major) was being treated as "at
the tonic" by 6 different files, when its actual identity (V7/IV) says otherwise.
`secondaryDominantRelationships` had a self-referential case of this (C7 querying itself produced
a 5-way fan-out including a C7->C7 self-loop instead of resolving to F); the same hazard existed in
`relative`/`borrowed`/`nearbyKey`/`distantKey`/`functionalDominant`(relationship), all gated on
root-only `isTonic()`; and `substitutionRelationships` mislabeled C7 as tonic-function via
`classifyFunction` (root-only) and offered it Em/Am as substitutes. Fixed by adding a
`!isRecognizedDominant(source, context)` guard to the six anchor checks, and by introducing
`src/domain/harmony/contextualRole.ts` — a new, explicitly fourth concept (chord identity /
diatonic-root family / **contextual role** / relationship-to-another-chord) that lets a chord's
quality and any already-detected specific relationship override the plain root family, falling
back to it only when nothing more specific applies. Also fixed: two mislabeled test titles calling
A7 "V7/vi" (it's V7/ii) — the underlying code/metadata were already correct in both cases, but
added explicit degree+resolution-target tests for every C-major secondary dominant so that class of
mistake can't recur unnoticed. Tests: 183 → 222. Ran `music-theory-review` again on the fixes; it
found one more instance of the same test-title mislabeling and nothing else. `test`/`typecheck`/
`lint`/`build` all pass. Still stopped before Phase 4, per instruction.

## Phase 4 — Core harmonic map UI
- [ ] Preview deployment — **blocked on external setup**, see verification note below
- [x] Custom deterministic SVG map renderer (not Canvas/force-physics — see `architecture.md`),
      current chord + relevant neighbors at the active Zoom, progressive expansion
- [x] One node per unique chord identity, even when multiple relationship types connect to it
      (see `architecture.md` "Harmonic map: one node per chord") — combine as edge metadata/badges,
      never duplicate nodes
- [x] Select vs recenter as distinct actions; "add to progression" is a visible, honestly-disabled
      placeholder (real logic is Phase 5 — not implemented here, per instruction)
- [x] Contextual side panel (chord identity, notes, interval formula, contextual role,
      relationship-to-source)
- [~] Zoom control — all 4 levels usable now (per instruction, for Phase 4 dev/testing);
      architecturally ready for gating (`maxAllowedZoom` prop, disabled-state styling already
      wired) but entitlements are not enforced yet — that's Phase 11, not this phase

Verified 2026-08-11: `npm run test` (254 tests, 27 files — up from 222; new coverage: map-graph
de-duplication, radial layout determinism, the explorer select/explore/zoom/context reducer, key
option generation, and chord-panel display info), `typecheck`, `lint`, `build` all pass. Manually
exercised in a real browser (dev server + Playwright): desktop and mobile (fresh-load collapsed
bottom sheet + expand), keyboard tab-order with correct `aria-label`s per node, Spanish locale,
select-vs-explore-recenter (confirmed the map does NOT recenter on selection and DOES on "Explore
from here"), Zoom depth change, and the Free-mode honest empty state. Caught and fixed one real
bug during that verification: `next-intl` rejects message keys with an embedded `.` (dots mean
nesting in their system), which broke every `*.resolve`-suffixed domain explanation key
(`harmony.relationship.functionalDominant.resolve` etc.) — renamed to camelCase
(`functionalDominantResolve`) across 4 domain files and both message files; documented the
constraint in `harmony/types.ts`'s `Explanation` doc comment so future relationship families don't
reintroduce it. Ran `product-scope-review` (verdict: aligned, no violations) and `release-check`
before considering this done.

Preview deployment: this environment has no Vercel/deploy credentials or CLI auth (checked: no
`.vercel` project link, no deploy-related env vars, `vercel` CLI installs via npx but isn't logged
in). Did not improvise credentials. See the Phase 4 completion report for exact external setup
steps.

**Phase 4.1 UX/polish pass 2026-08-11 (user review):** 7 targeted fixes on top of the approved
Phase 4 visual direction — no redesign:
1. Map visual prominence: `layout.ts`'s SVG viewBox is now sized dynamically from the rings
   actually populated at the current Zoom (was a fixed 700×700 sized for Zoom 4's worst case),
   plus larger node radii (`SOURCE_NODE_RADIUS`/`NEIGHBOR_NODE_RADIUS`, now exported and shared
   with `HarmonicMap.tsx` so the viewBox margin can never drift from what's actually drawn) — the
   map now fills its available space at every Zoom level instead of sitting small in a
   mostly-empty box at Zoom 1.
2. Key selector shows full "C Major"/"A Minor" (new `app.key.major`/`minor` i18n keys), never a
   bare tonic letter.
3. Contextual panel now shows a scale-degree roman numeral plus a refined tonic/tonic-function
   distinction (new `harmony.function.tonicFunction` i18n key; new presentation-only
   `chordPanel/functionDisplay.ts`, no domain-engine changes) — e.g. "I · Tonic" for C vs
   "vi · Tonic function" for Am in C major; predominant/dominant get no such qualifier regardless
   of degree, per spec. Roman numerals are shown only for the plain diatonic family
   (`contextualRole.kind` of tonic/predominant/dominant), never for an already-overridden role
   (secondary dominant, borrowed, etc.) — this specifically avoids relabeling a chord like C7 in C
   major as "I" just because it shares the tonic's root (see `contextualRole.ts`'s documented
   hazard); covered by `functionDisplay.test.ts`.
4. Multiple-relationship badge changed from a bare count to "+N" (N = additional relationships
   beyond the primary one).
5. Relationship discoverability at deeper Zoom levels: edges now show a small badge (the existing
   per-category glyph — ◆/V/B/◇/·) at their midpoint, and a native `<title>` tooltip with the full
   relationship description on hover/focus — no permanent legend added. Selected-relationship edge
   highlighting strengthened (width 3/opacity 1 vs 1.25/0.35, up from 2/0.85 vs 1.5/0.4).
6. Free mode duplication removed: the separate toolbar button is gone; `KeySelector`'s `onChange`
   now accepts `Key | null` and its own "Free mode" dropdown option is the only way to enter free
   mode (still shows the same honest empty state — no faked harmonic inference). Selector header
   relabeled "Harmonic context" / "Contexto armónico" to match.
7. Mobile node/map scale improved as a direct consequence of item 1's dynamic viewBox.

Verified 2026-08-11: `npm run test` (264 tests, 30 files — up from 254; new coverage:
`functionDisplay.test.ts` including an explicit anti-regression case for the C7-sharing-tonic-root
hazard), `typecheck`, `lint`, `build` all pass. Re-verified live in a browser (dev server +
Playwright): desktop and mobile, English and Spanish, Zoom 1 and Zoom 3, the consolidated Free
mode dropdown option, and the tonic/tonic-function distinction in both languages. Ran
`product-scope-review` (verdict: aligned — presentation-only changes, no new edges/relationships
fabricated, three-action rule and loop integrity untouched).

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
