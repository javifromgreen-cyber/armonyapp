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

**Phase 4.2 correctness fix 2026-08-11 (user review):** the contextual panel's "relationship to
source" list ignored the active harmonic depth — `chordDisplayInfo.ts` queried
`relationshipsBetween(..., 4)` unconditionally, so a Zoom-2 relationship (e.g. "Substitute chord")
could appear in the panel while the map itself was at Zoom 1 and correctly hiding it (map and panel
disagreeing on what's "visible"). Fixed by threading the active Zoom through
`getChordDisplayInfo(chord, sourceChord, context, activeDepth)` → `ChordContextPanel` (new `zoom`
prop) → `ExplorerApp` (`state.zoom`), so the panel now queries relationships with the same depth
cap the map uses. Documented the entitlement-compatibility intent directly in `chordDisplayInfo.ts`:
once Phase 11 caps the Zoom a user can reach, that cap only needs to clamp `state.zoom` itself
before it's dispatched — `activeDepth` flowing through this function unchanged already gives
`min(activeHarmonicDepth, maxAllowedHarmonicDepth)` without this function knowing about
entitlements. Added regression tests (`chordDisplayInfo.test.ts`) covering the Cmaj7→Am case at
Zoom 1 (diatonic + relative only, no substitution) and Zoom 2 (all three), plus a depth-invariant
check across all four Zoom levels. Verified live in browser: Zoom 1 badge "+1" / panel shows
Diatonic + Relative minor only; Zoom 2 badge "+2" / panel adds Substitute chord. `npm run test` (267
tests), `typecheck`, `lint`, `build` all pass.

## Phase 5 — Progression builder
- [x] Framework-free progression domain (`src/domain/progression`): add/remove/reorder chords,
      per-item duration, BPM, time signature, clear, context-aware transposition — all pure
      functions, no React
- [x] "Add to progression" enabled (uses the panel's SELECTED chord, never the explored/central
      one); select/explore/add stay fully distinct — SELECT/EXPLORE and ADD dispatch to two
      separate reducers, so there is no code path from selecting/exploring to progression mutation
- [x] Persistent progression UI: desktop full-width strip below the map; mobile via a single
      tabbed bottom sheet shared with the chord panel (never two stacked sheets)
- [x] Reorder (move-earlier/move-later buttons, no drag-and-drop dependency), duration dropdown
      (1/2/4/8 beats), BPM (validated/clamped, commit-on-blur), time signature (4/4, 3/4, 6/8),
      clear
- [x] Transposition (±1 semitone buttons) via the existing context-aware engine
      (`transposeChord`/`transposeNote`) — correct conventional enharmonic spelling, not a naive
      shift; progression survives changing the map's harmonic context (verified live: G Major
      re-centers the map, progression chords stay untouched)
- [x] Disabled "Play" transport placeholder (Phase 6 scaffolding only, per instruction — no audio)
- [x] All new UI copy in `en`/`es` via next-intl (`app.progression.*`)

Verified 2026-08-11: `npm run test` (296 tests, 32 files — up from 267; new coverage:
`progression.test.ts` covering add/remove/reorder/duration-clamping/BPM-clamping/time-signature/
clear/transposition incl. the product-spec worked example Cmaj7→Dmaj7 + Am7→Bm7 at +2 semitones and
a round-trip enharmonic-correctness check, plus `progressionReducer.test.ts`), `typecheck`, `lint`,
`build` all pass. Manually exercised in a real browser (dev server + Playwright) end-to-end: C
Major/Zoom 1, selected and added 4 chords, confirmed the map never recentered/mutated during
selects+adds, edited a card's duration, reordered by moving a card earlier, changed BPM to 120,
transposed +1 semitone (F→Gb, Am→Bbm, Cmaj7→Dbmaj7, Dm→Ebm, correct conventional spelling), changed
harmonic context to G Major and confirmed the progression was untouched, cleared it. Also verified
Zoom 3, Spanish (full translation incl. "Contexto armónico"/"Añadir a la progresión"/"Vaciar
progresión"), and mobile (collapsed tab-bar peek showing live chord + progression counts, expanding
to the Progression tab without hiding the map, adding a chord from the map while the sheet was
collapsed). Zero console/page errors across all runs. Ran `product-scope-review` (verdict: aligned
— three-action rule and loop integrity intact, no DAW-style chrome, no invented Free limits) and
`release-check` before considering this done.

Caught and fixed one real bug during verification, before it ever reached the user: an early
implementation rendered `ProgressionEditor` twice simultaneously (once in the desktop strip, once
CSS-hidden inside the mobile sheet) so it would "work" via CSS visibility alone but leave two live
component instances editing the same shared state redundantly at every breakpoint. Replaced with a
`useSyncExternalStore`-based `useIsDesktop()` hook so exactly one layout (desktop sidebar+strip vs.
mobile tabbed sheet) is ever mounted at a time — also resolved a `react-hooks/set-state-in-effect`
lint error the first `useEffect`-based attempt at the same hook had triggered.

## Phase 6 — Audio
- [x] Tone.js setup, neutral harmonic playback ("Hear chord" in the selected-chord panel — pure
      auditory preview, never touches selection/exploration/progression state)
- [~] Instrument/voicing playback — architecture ready (`playPitches`/`PlayablePitch[]` is a
      low-level primitive any future guitar/piano/bass voicing can call directly), but the actual
      instrument-specific voicings themselves are Phases 7-9, not built here
- [x] Progression playback with transport — Play/Stop via `Tone.Transport` (never `setTimeout`
      chains), honours chord order/durationBeats/BPM; currently-sounding chord highlighted on its
      card

Architecture: `src/audio/{pitch,scheduling,voicing}.ts` are pure and framework-free (no Tone.js
import) so the musically-meaningful logic is unit-tested without any audio API; `src/audio/player.ts`
is the only file touching Tone.js, kept as thin as possible. `src/components/audio/usePlaybackController.ts`
is the React-facing seam (isPlaying/playingItemId/error UI state only, no scheduling logic).

Documented V1 conventions (see `docs/music-engine.md`'s new "Phase 6 — audio" section):
- **Beat timing**: `durationBeats` is always a count of quarter-note beats at the progression's
  BPM, independent of `timeSignature` — 4/4, 3/4, 6/8 don't change the math; time signature is a
  structural label only for v1 (no compound-meter reinterpretation of 6/8).
- **Neutral voicing**: a compact close-position stack (root at octave 4, each subsequent tone at
  the smallest ascending step above the previous one) — not instrument-accurate, just a musically
  sensible default.
- **Pitch math**: raw frequency computed from MIDI (`440 * 2^((midi-69)/12)`), never Tone.js's
  note-name string parser — sidesteps any risk from the domain layer's legitimate double-flat/
  double-sharp spellings.
- **Progression-changes-while-playing**: any progression edit (add/remove/reorder/duration/BPM/
  time-signature/clear/transpose) stops playback automatically, applied through one wrapper
  (`dispatchProgression` in `ExplorerApp.tsx`) rather than repeated per-handler — the simpler
  reliable choice the brief explicitly allowed over live-retiming.
- **AudioContext**: only ever started/resumed from inside a genuine click handler (`Tone.start()`
  in `ensureAudioReady`), never on mount; init failures surface as a translatable
  `AudioInitError`/dismissible banner, never a raw Tone.js/Web Audio error.

Verified 2026-08-11: `npm run test` (320 tests, 36 files — up from 296; new coverage:
`src/audio/{pitch,voicing,scheduling}.test.ts` covering MIDI/frequency conversion, close-position
voicing correctness incl. the octave-bump case, the product-spec worked example Cmaj7(4) A7(4)
Dm7(2) G7(2) schedule, BPM-proportional timing, and the "time signature doesn't change beat
duration" invariant), `typecheck`, `lint`, `build` all pass (build also confirms Tone.js imports
cleanly under SSR). Manually exercised in a real browser (dev server + Playwright, real click
events so the browser's audio-gesture requirement is genuinely satisfied): selected Cmaj7 then Am
and used Hear chord on each — confirmed the map stayed on Cmaj7/zoom unchanged and the progression
stayed empty both times; built Cmaj7→A7→Dm7→G7 (the exact product-spec worked example) at Zoom 2,
set two different durations, played it and watched the highlighted card move from Cmaj7 to A7 as
scheduled; Stop mid-playback correctly returned to the Play state; toggling Play/Stop repeatedly
caused no overlapping playback or errors; changing BPM mid-playback correctly stopped it (the
documented V1 behaviour). Also verified Spanish (Escuchar acorde/Reproducir/Detener) and mobile
(Play/Stop remained reachable and the map stayed visible above the collapsed progression dock
during playback — it never auto-expanded to cover the map). Zero console/page errors across every
run. Ran `product-scope-review` (verdict: aligned — Hear/Play stay auditory-only, no DAW-style
transport, no gating introduced) and `release-check` before considering this done.

## Phase 7 — Piano representation
- [x] Keyboard UI, root position + inversions/voicings, Free/Pro catalogue split

Architecture: `src/domain/instruments/playablePitch.ts` (new shared concept — a chord tone at a
REAL octave, carrying the spelled `Note`, plus MIDI/frequency math; `src/audio`'s neutral voicing
now builds on this too, replacing its own former `pitch.ts`) and `src/domain/instruments/piano/`
(`voicing.ts` — `PianoVoicing` generation; `keyboardLayout.ts` — pure white/black key geometry).
React layer: `src/components/chordPanel/piano/{PianoKeyboard,PianoVoicingPanel}.tsx`, integrated
directly into the existing `ChordContextPanel` (no separate piano page) — a PIANO section renders
right below chord identity, with a keyboard, a Previous/Next voicing navigator, suggested
fingering, and a "Hear this voicing" action distinct from "Hear chord". `activeInstrument`
architecture note: rather than showing a single-option instrument selector before Guitar/Bass
exist (Phase 7 §3's "choose the cleaner UX"), the panel simply has a "PIANO" section heading now;
adding Guitar/Bash later is a matter of the same panel gaining sibling sections/tabs, not a
rewrite.

Voicing catalogue (documented in full in `docs/music-engine.md`'s new "Phase 7 — piano
representation" section): triads get all 3 inversions (Free); 7th/6th-family chords get all 4
inversions (root+1st Free, 2nd+3rd Pro); 9th-family chords get root+1st inversion (Free) plus one
deterministic Pro "open" voicing (top tone raised an octave) rather than continuing to rotate.
Inversion identity is derived from the bass tone by construction, never hand-labeled. Suggested
right-hand fingering (1-3-5 / 1-2-3-5) is offered only for the two close-position shapes reliable
enough to suggest; 5-tone and open-spacing voicings correctly omit it. Register placement reuses
the same closest-ascending-step algorithm as Phase 6's neutral playback, verified to stay
centrally registered regardless of root letter (spot-checked with Bmaj7-family and Dbmaj7).

Verified 2026-08-11: `npm run test` (366 tests, 38 files — up from 320; new coverage:
`playablePitch.test.ts`, `piano/voicing.test.ts` incl. the product-spec's exact C major/Cmaj7/G7/
Bm7b5/Dbmaj7/F#dim7/C9/Cm9 examples, and `piano/keyboardLayout.test.ts`), `typecheck`, `lint`,
`build` all pass (build also confirms no SSR regression from the `src/audio` refactor). Manually
exercised in a real browser (dev server + Playwright): selected Cmaj7 — root position showed C4 E4
G4 B4 exactly; stepped to 1st inversion — keyboard updated to E4 G4 B4 C5 exactly, root marker
followed the C key regardless of its position in the voicing; 2nd inversion correctly showed a
"Pro" badge and matching fingering; "Hear this voicing" and "Hear chord" both fired without
affecting the explored chord, selection, or progression (still empty throughout); selected G7 at
Zoom 2 and confirmed its own root-position notes; verified Spanish (Posición fundamental/Primera
inversión/Digitación sugerida/Escuchar esta disposición) and mobile (piano renders correctly
inside the mobile Chord tab, keyboard stays legibly sized). Zero console/page errors across every
run. Ran `music-theory-review` (no correctness issues; one documented-not-a-bug observation about
voicing-to-voicing register jumps, now recorded in `music-engine.md`), `product-scope-review`
(verdict: aligned — stays representation, not a theory course; three-action rule intact) and
`release-check` before considering this done.

**Phase 7.1 Free/Pro correction 2026-08-12 (user review):** triads originally gave all 3
inversions (root/1st/2nd) to Free, inconsistent with the rest of the catalogue. Fixed
`catalogueFor()` in `src/domain/instruments/piano/voicing.ts` to a single uniform rule — root
position and 1st inversion are Free for every chord size; everything past that is Pro — so a
triad's 2nd inversion now correctly requires Pro, matching the already-correct 7th-chord
(root+1st Free, 2nd+3rd Pro) and 9th-chord (root+1st Free, open voicing Pro) behavior, which were
left unchanged. Pro voicings remain inspectable in the dev build (no entitlement enforcement until
Phase 11), per instruction. Updated the one affected test
(`voicing.test.ts`'s triad-catalogue assertion) and `docs/music-engine.md`'s Phase 7 voicing
catalogue note. `npm run test` (366 tests), `typecheck`, `lint`, `build` all pass.

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
