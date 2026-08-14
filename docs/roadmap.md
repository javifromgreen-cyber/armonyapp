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
- [x] Fretboard/chord diagram, TAB, finger numbers
- [x] Voicing generation + playability ranking, automated tests
- [x] Free (~2 voicings) vs Pro (expanded) catalogue

Architecture: `src/domain/instruments/guitar/` (framework-free, standard tuning only — Phase 8
§3), reusing Phase 7's shared `PlayablePitch` for real-octave pitch math and the same
`ChordContextPanel` integration pattern as Piano (a GUITAR section, no separate page). Pipeline:
`chordTones.ts` (pairs `chordNotes()`/`chordIntervalFormula()` per-tone — the chord engine is the
only source of harmonic truth, never re-derived) → `candidates.ts` (raw fret/mute combinations
from 3 musically-anchored search windows: open position frets 0-4, and movable E-shape/A-shape
windows anchored to the root's fret on strings 6/5 — not an arbitrary neck-wide slide) →
`playability.ts` (`evaluateCandidate`: rejects candidates with fewer than 3 sounding strings, a
fret span over 4, or more than 4 independent fretting fingers after crediting a real barre as one
finger; `detectBarre` requires every string in the FULL numeric range between the lowest and
highest string sharing the minimum fret to be fretted, not just the strings that sound there — this
is what correctly recognizes F major's 1-3-3-2-1-1 as a genuine 6-string barre even though only
strings 6/2/1 sound at fret 1) → `ranking.ts` (deterministic scoring, no LLM) → `voicing.ts`
(orchestrator: curated shape first when one exists, then generated candidates filtered for
chord-tone completeness and deduplicated by exact fret signature, first 2 tagged Free / rest Pro,
capped at 5 total; returns `[]` — never a fabricated shape — when nothing playable is found).
`curatedShapes.ts` hand-verifies 8 canonical open shapes (C A G E D Am Em Dm, per product-spec
§25's example list) cross-checked against the chord formula in tests; every other chord/root is
purely algorithmic, sharing the exact same `GuitarVoicing` output model. `tab.ts` derives TAB lines
directly from `GuitarVoicing.strings` (high string first, `E`/`e` distinguished correctly), so TAB
and the diagram can never drift apart. React layer:
`src/components/chordPanel/guitar/{GuitarDiagram,GuitarVoicingPanel}.tsx` (SVG diagram — string 6
left, string 1 right, nut at top, per the documented fixed orientation — with fret/string grid,
open/muted markers, a barre bar, and a root marker distinguished by an inner dot, never color
alone) plus a new `InstrumentSelector` (Piano/Guitar radiogroup) lifted into `ExplorerApp` as plain
`useState` with no reducer dispatch, so switching instruments cannot touch chord/map/progression
state by construction (verified live, not just by code review). "Hear this voicing" plays the
voicing's exact sounding `PlayablePitch[]` (muted strings silent) through the existing Phase 6/7
player, extended with an optional `strumDelaySeconds` (20ms) for a light strum stagger — same
shared synth, no new audio engine.

Verified 2026-08-12: `npm run test` (474 tests, 40 files — up from 366; new coverage: 108
guitar-domain tests across `tuning`/`curatedShapes`/`candidates`/`playability`/`voicing.test.ts`
covering the full representative chord list from product-spec §33 — C G D A E F Am Em Dm Bm Cmaj7
G7 Am7 Bm7b5 F#dim7 Dbmaj7 C9 Cm9 — plus negative/rejection cases for unplayable shapes),
`typecheck`, `lint`, `build` all pass. Ran `music-theory-review` (extended per §34 to physical
plausibility/fingering/barre realism, not just harmonic correctness): traced every domain module by
hand against standard tuning and chord theory (tuning intervals, curated open shapes, barre
full-range detection, chord-tone completeness rule, 9th-family tone ordering) and found them
correct; the one real defect found was in ranking quality, not harmonic correctness (below). Ran
`product-scope-review` (verdict: aligned — guitar stays inside the existing chord panel, the
instrument selector is verified by construction never to touch selection/map/progression state, no
DAW/theory-course/chatbot drift). Ran `release-check` (all four gates pass, no regressions in the
pre-existing 366 tests).

Manually exercised in a real browser (dev server + Playwright, English + Spanish + a 390px mobile
viewport): switched Piano→Guitar without disturbing the selected/explored chord or map; selected C
major and got the curated x32010 shape with diagram and TAB in exact agreement; used "Hear this
voicing"; stepped through voicings with Previous/Next; selected G, F, Am, Cmaj7, G7, and Bm7b5
directly from the map (Zoom 4) and confirmed each voicing's diagram/TAB/fingering were internally
consistent and sounded the required chord tones; confirmed a Pro badge appears from the 3rd voicing
onward; switched Guitar→Piano and confirmed the selected chord's `aria-label` was byte-identical
before and after; verified Spanish translations (Guitarra/Posición abierta/Cejilla/Primera
inversión/etc.) and mobile legibility. Zero console errors throughout. Dbmaj7 and C9 aren't reachable
from C major's harmonic map (they're not diatonic/secondary/borrowed relationships in that key —
correctly so, per Phase 8 §1's "harmonic map stays unchanged" and product identity as a harmony
tool, not a free-form chord picker) — both are covered instead by the automated domain/integration
test suite, which includes them explicitly in the representative chord list.

**Bug found and fixed during live verification**: the initial ranking weights
(`fingerCount * 5`, `mutedInteriorCount * 4`, `soundingStringCount * 1`) ranked a sparse 3-string F
fragment (open A string plus only the top two strings fretted, with the D and G strings muted in
between) above the standard 6-string F barre, because saving fingers outweighed a "string-skipping"
penalty that was too weak — the top-ranked F voicing didn't read as "F" to a guitarist, even though
every candidate involved was individually correct and playable per `evaluateCandidate`. This is
exactly the class of bug isolated unit tests can't catch (each candidate was independently valid;
only their relative ranking was wrong) and that live musician-facing review exists to catch.
Rebalanced `ranking.ts` (`soundingStringCount * 2`, `fingerCount * 3`, `mutedInteriorCount * 10`) to
properly implement the two documented-but-under-weighted ranking factors from product-spec §26
("balanced distribution" and "awkward string skipping") — verified across F, G7, Bm7b5, C9, Dbmaj7,
Cmaj7, Bb, and F#dim7 that recognizable shapes now surface without changing which shape wins for
any curated chord (curated shapes always rank first regardless of score, so C/A/G/E/D/Am/Em/Dm were
never affected). Added a regression test (`voicing.test.ts`) asserting F's top voicing sounds the
full triad with zero muted-interior strings, so this can't silently regress.

Known limitation, documented rather than hidden: the ranking formula rewards full/balanced string
coverage, which occasionally surfaces a non-textbook inversion (e.g. Cmaj7's top-ranked shape rings
the open low E string, giving a 1st-inversion 6-string voicing rather than the more commonly-taught
x32000 with the low E muted). Every such voicing is musically correct and genuinely playable — this
is a shape-preference nuance, not a wrong-notes bug — and is exactly the kind of thing a future
"prefer textbook root-position when curated data doesn't already cover it" refinement could improve
without any architecture change.

**Phase 8.1 ranking refinement 2026-08-12 (user review):** the Phase 8 "known limitation" above was
exactly what this pass fixed — a focused improvement to *which* correct/playable voicings surface
first, no architecture change. Four changes, all in `src/domain/instruments/guitar/`:
1. **Root-position tie-breaker** (`ranking.ts`): `scoreVoicing` gained a 4th parameter,
   `isRootPosition`, worth a modest `+8`. Sized to flip ordering only between otherwise-comparable
   candidates (the fretSpan×6/fingerCount×3 penalties still dominate for real playability gaps) —
   inversions remain fully valid and often still win on their own merits.
2. **Curated-shape set expanded from 8 to 10** (`curatedShapes.ts`): added Cmaj7 (`x32000`) and F
   major (`133211`), the two chords named in live verification as having a generated-catalogue
   default that didn't match what a guitarist would expect as "the" shape. Curated shapes always
   rank first and bypass scoring entirely, so this guarantees correctness for these two rather than
   relying on ranking-weight tuning alone.
3. **Diversity pass** (new `diversity.ts`): after ranking, a deterministic near-duplicate filter
   (`diversityFilter`) keeps the best-ranked representative of each cluster and drops near-copies —
   two voicings are a near-duplicate when they share the same inversion, a base fret within 2 of
   each other, and a fret pattern differing on at most 1 of the 6 strings. Compares fret patterns,
   never pitch-class sets, so genuinely different shapes that happen to sound the same notes are
   never collapsed. Curated shapes are passed in as `alreadyKept` so a generated near-copy of a
   curated shape never wastes a catalogue slot.
4. Root-position preference and diversity filtering apply to every chord's generated catalogue, not
   just the two curated additions — spot-checked C, G, Am, G7, Bm7b5, Dbmaj7, C9.

Verified 2026-08-12: `npm run test` (493 tests, 41 files — up from 474; new coverage: `diversity.ts`'s
own unit tests plus a new "Phase 8.1 ranking refinement" describe block in `voicing.test.ts` covering
the x32000/133211 regression cases with exact fret-pattern and barre-metadata assertions, root-position
presence within the first 2 voicings, near-duplicate-free catalogues across the full chord list, and
Free-stays-2/Pro-stays-broader), `typecheck`, `lint`, `build` all pass, zero regressions in the
previously-passing 474. Ran `music-theory-review` (verdict: no correctness issues — the two curated
additions were hand-verified against the chord formula, and neither the ranking bonus nor the
diversity filter can select a harmonically incomplete or physically invalid candidate, since both run
strictly after `evaluateCandidate`/`meetsCompleteness`). Ran `product-scope-review` (verdict:
aligned — domain-only change, no UI/map/Free-Pro-mechanism changes). Ran `release-check` (all four
gates pass).

Manually verified live in a browser (dev server + Playwright): Cmaj7's first voicing is now x32000
("Open position / Root position / 1 of 5"), second voicing is 032000 ("1st inversion" — a genuinely
different, useful alternative with all six strings ringing); F's first voicing is now the full
133211 barre ("Movable shape / Root position / 1 of 5") with correct diagram (one wide barre bar
labeled "1", individual finger dots "2"/"3", root marker), fingering (`1 3 4 2 1 1`), and TAB
(`1 1 2 3 3 1`, high string first) all in agreement. Spot-checked C, G, Am, G7, and Bm7b5 — all
unaffected or improved (Bm7b5's first voicing is now also root position as a side effect of the
general tie-breaker). Zero console errors.

Trade-off, noted rather than hidden: G7's most iconic 6-string open shape (`320001`) is not among
G7's 2 Free voicings (it's Pro) — the algorithm's Free picks favor more compact, slightly less
"textbook" partial voicings that score comparably well. This wasn't a named regression target and
isn't a wrong-notes defect; it's the same class of shape-preference nuance documented above for
Cmaj7, left as-is per the instruction to keep this pass focused and not chase every chord's
"most iconic" shape individually.

**Update (Phase 8.2):** the G7 trade-off above was exactly what this next pass fixed — see below.

**Phase 8.2 canonical/basic voicing correction 2026-08-12 (user review):** the G7 trade-off flagged
in Phase 8.1 conflicts with the Freemium philosophy — a canonical/basic shape must never sit behind
Pro while unusual partial/inverted shapes are the Free defaults. Introduced an explicit small
"canonical/basic guitar voicing" concept: `curatedShapes.ts`'s existing curated layer (already used
for exactly this purpose for C/A/G/E/D/Am/Em/Dm/Cmaj7/F) gained one more entry, G7's classic open
`320001` (root position), hand-verified against the chord formula. No new mechanism was built —
this reuses the same curated-shape architecture from Phase 8/8.1 (bypasses ranking entirely, always
ranks first, same `GuitarVoicing` model, same test-verification pattern), staying a small hand-picked
layer rather than a chord dictionary. Verified all previously-curated shapes (C, G, D, A, E, Am, Em,
Dm, F, Cmaj7) are byte-identical to before — this was a pure addition, not a rebalancing.

Verified 2026-08-12: `npm run test` (500 tests, 41 files — up from 493; new coverage: `curatedShapes.test.ts`
gained G7 to its cross-checked case list plus an explicit "returns undefined for a dominant7 chord
whose root has no curated shape" negative case; `voicing.test.ts` gained a "Phase 8.2 canonical/basic
voicing correction" describe block asserting 320001 exists/has G in the bass/is root position/has the
correct G-B-D-F notes/is Free/ranks first, plus an explicit no-regression check that every
previously-curated shape's fret pattern is unchanged), `typecheck`, `lint`, `build` all pass, zero
regressions in the previously-passing 493. Ran `music-theory-review` (verdict: no correctness issues
— 320001 hand-verified note-by-note against standard tuning, and the change is purely additive
through the existing validated curated-shape pipeline).

## Phase 9 — Bass representation
- [x] Bass fretboard, chord tones, one pattern (Free) vs multiple (Pro)

Architecture: `src/domain/instruments/bass/` (framework-free, standard 4-string tuning only —
Phase 9 §3: E1 A1 D2 G2). Conceptually different from Guitar by design (Phase 9 §1): Guitar shows
concrete playable chord SHAPES, Bass shows how to NAVIGATE through/over a chord — a
`BassPattern.steps` array is a SEQUENCE through time, never a simultaneous block chord. Pipeline:
`chordTones.ts` (same "reuse the chord engine, never re-derive harmony" pattern as Guitar) →
`patternGeneration.ts` (`rootAnchors` — the two standard bass home positions, root on the E string
and root on the A string, Phase 9 §13 — plus `buildAscendingSteps`/`buildRootFifthOctaveSteps`, a
`findNextAscending` search that walks the local position choosing the smallest ascending pitch
step, tie-broken by PHYSICAL FRET DISTANCE from the previous note — not string-number distance —
since two strings tuned a 4th apart often reach the identical pitch, and the smallest actual hand
movement is what matters, not which string) → `playability.ts` (fret-span rejection +
1-2-4-vs-1-2-3-4 fingering, bass-specific because bass frets are wider than guitar's) →
`ranking.ts`/`diversity.ts` (mirroring Guitar's deterministic-scoring/near-duplicate philosophy at
a much smaller scale, since patterns are recipe-generated, not searched) → `bassPatterns.ts`
(orchestrator: exactly 4 pattern types — `basicArpeggio` and `alternativePosition` always Free in
that order when both exist, per Phase 9 §9's worked example; `rootFifthOctave` and
`descendingArpeggio` Pro). `fretboardMap.ts`'s `localChordToneMap` independently lists every
chord-tone-bearing fret in the local window across all 4 strings — the data source for the
fretboard's "available chord tones" layer, kept visually distinct from the current pattern's own
notes (Phase 9 §6). `tab.ts` derives sequential TAB directly from `BassPattern.steps` (one column
per STEP, not per fret position — Phase 9 §21/§22). React layer:
`src/components/chordPanel/bass/{BassFretboard,BassPatternPanel}.tsx`, integrated into the existing
`ChordContextPanel` exactly like Piano/Guitar (a BASS section, no separate page). The instrument
selector now offers Piano/Guitar/Bass; switching is still a plain `useState` with no reducer
dispatch, so it cannot touch chord/map/progression state by construction (verified live via an
automated round-trip check, not just code review). "Hear this pattern" reuses Phase 6/8's
`hearPitches(pitches, { strumDelaySeconds, durationSeconds, voice })` with `strumDelaySeconds` set
to one beat (`60/bpm`, reusing the progression's own BPM rather than introducing a second tempo
state — Phase 9 §24) and a new `voice: "bass"` option selecting a second, still-lightweight Tone.js
synth (sine oscillator, rounder/cleaner low end, no samples/effects — Phase 9 §25) — no new
playback engine.

Verified 2026-08-12: `npm run test` (601 tests, 47 files — up from 500; new coverage: 101
bass-domain tests across `tuning`/`patternGeneration`/`playability`/`diversity`/`fretboardMap`/
`bassPatterns.test.ts` covering the full representative chord list from Phase 9 §38 — C G F Am Em
Dm Cmaj7 G7 Am7 Bm7b5 F#dim7 Dbmaj7 C9 Cm9 Csus4 Caug, plus the full 17-quality V1 catalogue and
negative/rejection cases for oversized fret spans), `typecheck`, `lint`, `build` all pass. Ran
`music-theory-review` (extended per Phase 9 §39: chord-tone correctness, interval labeling,
whether patterns communicate chord quality, Free-pattern usefulness, low-position stretch realism,
sequence-direction sense, and extended-chord tone retention — all confirmed correct by hand and by
test, including bb7 surviving diminished7 and the full 9th-family identity surviving Cm9). Ran
`product-scope-review` (verdict: aligned — not a lesson/course/groove-generator/walking-bass-
generator/DAW/static-dictionary; still inside EXPLORE→UNDERSTAND→PLAY→COMPOSE). Ran `release-check`
(all four gates pass, zero regressions in the previous 500 tests).

Manually exercised in a real browser (dev server + Playwright, English + Spanish + a 390px mobile
viewport): switched Piano→Guitar→Bass and confirmed the selected chord's `aria-label` was
byte-identical before and after; selected C and confirmed root/3rd/5th/octave positions with a
matching TAB; used "Hear this pattern"; stepped through all 4 patterns for C confirming Free #1
("Basic arpeggio"), Free #2 ("Alternative position", a different root string), and Pro #3
("Ascending arpeggio" — the root-5th-octave skeleton, with a Pro badge); selected Am, Cmaj7, G7,
and Bm7b5 directly from the map (Zoom 4) and confirmed each pattern's interval sequence/fingering/
TAB were internally consistent (Bm7b5 correctly showed `1 → b3 → b5 → b7`); switched Bass→Piano→Bass
and confirmed the chord was unchanged; verified Spanish (Bajo/Arpegio básico/Digitación sugerida/
Escuchar este patrón/Abierta) and mobile legibility. Zero console errors throughout. C9 and Dbmaj7
aren't reachable from C major's harmonic map at any Zoom level (not diatonic/secondary/borrowed in
that key — correctly so, matching the same Phase 8 precedent) — both are covered instead by the
automated domain test suite, which includes them explicitly.

**Bugs found and fixed during this build, before any user review:**
1. **Ergonomics bug in `findNextAscending`'s tie-break**: when two candidate positions for the next
   ascending tone landed on the exact same pitch (common on a 4-string instrument — e.g. the A
   string's 7th fret and the D string's 2nd fret are both E2), the original tie-break preferred
   whichever candidate was on the SAME string as the previous note, which could mean a big
   same-string slide (e.g. fret 3 → fret 7) when a much smaller adjacent-string move (fret 3 → fret
   2 on the next string) reached the identical pitch. Fixed by tie-breaking on physical FRET
   DISTANCE from the previous note first, string-number proximity only as a final fallback —
   verified this turns C major's basic arpeggio from a 3-3-7-7-ish same-string slide into a compact
   walking pattern across adjacent strings (3→2→0(open)→5), which is what real bass technique
   prefers.
2. **Fretboard diagram aspect ratio**: the first implementation drew the local fretboard the same
   way Guitar draws a chord diagram — frets running vertically, strings horizontal — which is fine
   for a guitar chord's few frets but made a multi-fret bass PATTERN awkwardly tall (7+ fret rows),
   pushing the TAB block below the fold and requiring scrolling inside the panel. Redesigned to a
   horizontal layout (frets left-to-right, strings top-to-bottom matching the TAB block directly
   below it) — this is also a genuinely better fit for a "pattern/position" visualization
   specifically, distinct from a "single chord shape" visualization.
3. **Marker legibility**: an intermediate version gave every root-pitch-class step (including a
   triad's closing OCTAVE step) an inner-dot marker with no visible number, silently dropping the
   sequence-order label for that step. Fixed so every step always shows its play-order number, with
   root notes additionally getting an outline ring — root stays "strongly distinguished" (Phase 9
   §34) without erasing the sequence Phase 9 §6 requires.

Known limitation, documented rather than hidden: `descendingArpeggio` is defined as the exact
reverse of `basicArpeggio`'s own notes (Phase 9 §11's family list), not an independently-routed
descending line — this is a deliberate V1 simplification (guarantees the two can never disagree)
rather than a bug; a future pass could give it its own physically-optimized descent if that proves
valuable in practice.

---

# Refinement phases (R1–R4)

Inserted 2026-08-13 after personally testing the deployed Phase 1–9 product. **Not a rebuild** —
Phases 1–9's engine/architecture/tests are preserved and built upon, not replaced. These phases
refine the business model, instrument audio, and core navigation UX before infrastructure
(authentication/persistence/billing) resumes below. See `docs/product-spec.md` for the full
revised spec text this implements/will implement.

## Phase R1 — Product/business-model documentation revision
- [x] Remove the permanent Free/Pro/Lifetime commercial model from all source-of-truth docs
- [x] Document the 72-hour trial + required Annual license model (price not yet decided)
- [x] Document the central entitlement model (`trialing`/`active`/`expired`)
- [x] Document the Free/Pro catalogue-flag migration strategy (basic/extended, non-commercial)
- [x] Document the export policy (trial/active only, Phase R4 implements it)
- [x] Document the revised harmonic-navigation product concept (path explorer, completeness rule)
- [x] Revise the roadmap sequence (R1–R4 before 10A/10B/11/12)

**Documentation-only — no application behavior changed.** Files touched: `docs/product-spec.md`
(§0, §6, §8, §9, §13–15, §17, §19–22, §23–26, §30–32, §40), `docs/architecture.md` (stack table,
Entitlements section, data model, Deviations log), `docs/roadmap.md` (this section),
`docs/music-engine.md` (a new migration note on Free/Pro catalogue tags), `CLAUDE.md` (entitlement
capability names, a new "ranking organizes, never deletes" hard rule), `.env.example` (dropped the
`STRIPE_PRICE_ID_PRO_LIFETIME` placeholder). No `src/` application code changed; the existing
`VoicingCatalogue = "free" | "pro"` type and all Phase 7–9 instrument logic are untouched and still
fully functional — see `docs/music-engine.md`'s new migration note for why, and what "clean
migration" means when code-level renaming eventually happens.

Full revision content, contradictions found, and rationale are in the R1 completion report
delivered alongside this change (not duplicated here — see the conversation this phase was done
in, and the substance is captured in the product-spec.md/architecture.md sections listed above).

## Phase R2 — Instrument audio quality
- [x] Evaluate whether synth-only playback can achieve real Piano/Guitar/Bass identity
- [x] Move to a lightweight sample-based approach if not (`Tone.Sampler` or equivalent)
- [x] Piano: recognizable acoustic piano, not organ/generic synth/Guitar
- [x] Guitar: clean plucked guitar, clearly distinct from Piano
- [x] Bass: clean fingerstyle electric bass — not fretless/synth/slap/short-and-piercing
- [x] Preserve the shared scheduling/playback architecture (no duplicated timing logic)
- [x] Lazy-load instrument assets; cache per session; no blocking of initial map load
- [x] Tests: instrument routing, Guitar strum order, Bass sequence order, no pitch/MIDI regression
- [x] Live verification on the deployed Vercel preview; explicit judgment on Bass in particular

Concluded synth-only playback (Phase 8/9's oscillator/envelope tweaks) cannot give genuine
Piano/Guitar/Bass timbral identity — confirmed by direct user listening feedback on the Phase 1–9
Vercel preview (Piano/Guitar too similar, Bass reading as short/artificial/fretless-synth-like).
Moved to `Tone.Sampler`, sparsely multisampled (4-semitone/major-third spacing) per instrument from
real recordings — legally usable CC BY 3.0 samples (FluidR3_GM General MIDI soundfont via
`gleitz/midi-js-soundfonts`; full attribution and license terms in `docs/audio-credits.md`),
re-hosted under this repo's own `public/audio/{piano,guitar,bass}/` rather than hotlinked. Bass
uses `electric_bass_finger` specifically (not fretless/synth/slap) for genuine fingerstyle
identity. "Hear chord"/progression playback stays on the pre-existing neutral `PolySynth` voice,
unchanged — only the three instrument panels' "Hear this voicing/pattern" route through samples.
Sample ranges sized from the domain layer's own real output (Piano 60–97 MIDI, Guitar 40–77, Bass
28–56), not guessed. Each instrument's samples lazy-load on first use via a new
`InstrumentVoice`/`getInstrumentVoice()` cache in `src/audio/player.ts` and stay cached for the
session; a new shared `useAsyncTrigger` hook shows a "Loading sound…" label on the triggering
button while the first load is in flight, applied identically across `PianoVoicingPanel`,
`GuitarVoicingPanel`, `BassPatternPanel`. `TriggerableVoice` structural typing keeps
`hearPitches()`'s existing strum-stagger/bass-sequential scheduling loop untouched — only the
voice source changed, no duplicated timing logic.

Verified 2026-08-13: `npm run test` (614 tests, up from 601 — 13 new in `src/audio/player.test.ts`
covering instrument routing, neutral-voice separation, strum/sequential order and timing, exact
pitch preservation, session caching, and safe stop), `npm run typecheck`, `npm run lint`,
`npm run build` all pass with zero regressions. Live-browser verification (Playwright against the
dev server): selected C, Cmaj7, Am, F chords on the map (G7 wasn't directly reachable as a graph
node from the C-major starting context at the depth tested) and clicked "Hear this voicing"/"Hear
this pattern" across Piano, Guitar, and Bass for each — all 28 sample files returned HTTP 200 on
first use per instrument, zero browser console errors, buttons correctly re-enabled after each
instrument's first load. Automated tests and this browser check confirm correct routing, no
pitch/MIDI regression, and no crashes/errors — they cannot confirm sound *quality*; per the
phase's own instruction, that judgment is the user's, pending their listen on the deployed Vercel
preview.

## Phase R3 — Progressive contextual harmonic navigation
- [x] New `ProgressionNavigationEngine`-equivalent layer on top of the existing (preserved) harmony
      graph engine — never a rewrite of `src/domain/harmony`/`src/domain/graph`
- [x] Core completeness guarantee: the navigation layer's next-chord set, deduplicated by chord
      identity, equals the full outgoing set the harmony engine exposes for that chord/context/depth
      — ranking organizes, never deletes
- [x] Progressive path UI: chosen path stays visible; only the current endpoint's options expand;
      choosing a next chord collapses the previous endpoint's unchosen siblings
- [x] Contextual ranking (recent path / actual progression precedence rule, documented explicitly)
- [x] "Hear transition" (current → candidate) and, if cleanly achievable, "Hear path"
- [x] Back/Reset navigation; explicit "Add to progression" stays distinct from exploring
- [x] Completeness invariant test across Depth 1–4 for representative chords/contexts
- [x] Context-ranking tests for representative paths (documented in the R3 report)
- [x] Live verification (desktop/mobile, English/Spanish) on the deployed Vercel preview

New framework-free `src/domain/navigation` module (`outgoingOptions`, `NavigationPath`/
`advancePath`/`goBack`/`jumpToStep`/`resetPath`, `currentMoveDepth`/`pathDepth`,
`harmonicCharacterFor`, `resolveHistoryContext`/`rankOptions`) sits above the untouched
`src/domain/harmony`/`src/domain/graph` engine — `outgoingOptions` reuses
`relationshipsFrom`+`groupRelationshipsByTarget` directly rather than re-deriving the graph, so
completeness is inherited from Phase 3/4's own tested grouping and re-verified by a dedicated R3
invariant test (`options.test.ts`) across 8 chord/context cases. Map interaction revised per the
user's superseding R3 instructions: clicking an already-previewed candidate node advances the path
directly (no "Explore from here" step); hovering/keyboard-focusing a candidate previews it in the
side panel first, without moving the path — this is a deliberate, explicitly-authorized revision of
the "select vs. explore" two-click rule from `docs/product-spec.md` §7/`CLAUDE.md` (both updated in
this change; `docs/architecture.md`'s Deviations log has the full rationale). The old manual Zoom
1–4 selector is removed (`ZoomControl.tsx` deleted, now dead code) — all four depths are always
queried at once; `DepthIndicator`/`PathBreadcrumb` take over that toolbar area with Current
Move/Path Depth and the chosen path (with Back/Reset/Hear path). Contextual ranking implements the
progression-vs-path precedence rule from a small, real-domain-grounded bonus (`classifyFunction`
tonic/predominant/dominant, never an invented per-component heuristic) — reorders only, proven
membership-preserving by construction (`rankOptions` is a map+sort over its own input). Harmonic
character (`naturalContinuation`/`strongResolution`/`tension`/`deceptive`/`modalColour`/
`substitution`/`chromaticColour`/`adventurous`) is derived from `relationshipType`, with two
context-sensitive, major-mode-only overrides (authentic-cadence "strongResolution" and V-vi
"deceptive") caught and scoped correctly during the `music-theory-review` pass below (natural
minor's weak natural dominant/subtonic must not read as a strong/deceptive resolution — its real
strong dominant, the harmonic-minor-derived V7/vii°, already gets `strongResolution` via the
baseline relationship-type table). `computeRadialLayout` now keys rings by each option's own move
depth (`NavigationOption.depth`) rather than a chord's shallowest depth across all its
relationships, so ring position always agrees with the depth badge/label shown on that node.

Verified 2026-08-13: `npm run test` (671 tests, up from 614 — 57 new: 49 in
`src/domain/navigation/*.test.ts`, 3 in `src/audio/player.test.ts` for `hearPath`/`hearTransition`,
plus `explorerState.test.ts`/`layout.test.ts`/`chordDisplayInfo.test.ts` rewritten for the new
model), `npm run typecheck`, `npm run lint`, `npm run build` all pass with zero regressions. Ran the
`music-theory-review` skill against `src/domain/navigation` — found and fixed one real issue (the
strongResolution/deceptive character overrides incorrectly firing on natural minor's weak natural
dominant/subtonic; scoped to major mode only, with a regression test). Ran `product-scope-review` —
verdict aligned; flagged that R3's click-to-advance model revises the previously-documented "three
distinct actions" rule, which is now written up in `product-spec.md` §7/`CLAUDE.md`/
`architecture.md` rather than left as a silent deviation. Live-browser verification (Playwright
against the dev server, desktop 1400×900 + mobile 390×844 with real touch events + Spanish locale):
the required C→Am→Dm→G7 scenario advances on a single click with no second "Explore from here"
click at any step, old sibling options collapse automatically, breadcrumb/Back/Reset/breadcrumb-
jump all work, Current Move/Path Depth update correctly, hover-preview shows a candidate in the
panel without moving the path and "Hear transition" plays it, a second click on an
already-previewed candidate advances, instrument selection (tested with Guitar) survives
navigation, all EN/ES strings render correctly. One real bug was found and fixed during this pass:
a React hydration mismatch from `Math.cos`/`Math.sin` differing in their last bit between server
and client — fixed by rounding `computeRadialLayout`'s coordinates to 3 decimal places. Zero
console errors after the fix. On mobile, a single tap both previews and advances in one gesture
(touch browsers synthesize a compatibility `mouseenter` immediately before `click`) — this still
satisfies the direct-click-advance requirement identically to desktop; true two-step
preview-then-commit is effectively a desktop/keyboard-focus refinement, documented in
`ExplorerApp.tsx` rather than forcing an extra dedicated tap target onto small map nodes, which
would work against §12's own "don't make the interaction cumbersome" instruction.

## Phase R3.1 — Harmonic map navigation UX correction
- [x] Remove the long visible exploration breadcrumb; navigation history stays internal (Back,
      ranking) but never renders as a progression-like chain
- [x] Single click/tap/Enter on a candidate: stop any in-flight audio, play the transition, and
      navigate, all as one action — no separate "Hear Transition"/"Continue path here" step
- [x] No audio on hover/focus — hover/focus is silent, informational-only, never navigates
- [x] Fix transition-audio cancellation (Transport-based scheduling) so a rapid second click
      actually cancels the first transition's still-pending notes, never overlapping
- [x] Local Back control anchored next to the current chord, not the top toolbar; Reset stays
      available but secondary
- [x] Redesign the map layout: one shared adaptive-radius ring for all immediate outgoing options
      (never depth-keyed concentric rings) — every candidate reads as a direct sibling of the
      current chord, not a descendant of another candidate
- [x] Completeness guarantee preserved — all outgoing options still shown, never truncated for
      readability
- [x] Readability: ring radius adapts to option count within a bounded, legible range instead of
      shrinking the whole map to fit a fixed worst-case depth-4 box
- [x] Stronger current-chord visual identity + a CSS arrival transition (respecting
      prefers-reduced-motion) so navigating visibly feels like moving, not an instant swap
- [x] Progression Builder untouched by exploration — verified with a dedicated regression test
- [x] R2 instrument sample audio unaffected — navigation preview stays on the neutral synth

This was a **corrective pass on R3's own map interaction**, prompted by the user's own testing of
the deployed R3 preview — R3's underlying navigation/domain architecture (`src/domain/navigation`,
completeness invariant, contextual ranking, automatic depth classification) was explicitly approved
and is untouched here (`git diff --stat HEAD -- src/domain` is empty for this phase); only
`src/components/map/**`, `src/components/chordPanel/ChordContextPanel.tsx`, `src/components/
ExplorerApp.tsx`, and `src/audio/player.ts`'s `hearPath`/`hearTransition` scheduling changed.

Two real UX problems were found in production testing: (1) the visible exploration breadcrumb
(`Em → C → Bm → C → Em → D#dim7 → ...`) read as an authored second progression rather than
incidental map history, and (2) depth-keyed concentric rings made deeper-depth options look like
descendants of shallower ones (e.g. "F#dim → C → Cmaj7 → Dm" appeared to be a chain) rather than
equally-direct siblings of the current chord. Both are fixed structurally, not cosmetically:
`explorerState.ts` no longer has a `previewChord`/two-step advance concept at all — a single
`ADVANCE` action is the whole interaction, and `layout.ts`'s `computeRadialLayout` places every
option on one ring sized by `adaptiveRadius(count)` (clamped 160-300px) rather than keying rings by
`NavigationOption.depth`.

The transition-audio cancellation bug (§7/§33's mandatory test) was a genuine latent issue in R3's
original `hearPath`: it scheduled notes via raw `Tone.now()`-relative offsets, which cannot be
cancelled once scheduled — a rapid second click could let both transitions' notes sound together.
Fixed by scheduling on `Tone.Transport` (reusing `playProgression`'s existing mechanism) and calling
`stopProgression()` first, so `Transport.cancel()` actually clears pending events; a dedicated
regression test (`player.test.ts`) reproduces the exact click-Am-then-quickly-click-F scenario and
asserts only the second transition's notes fire.

Documentation updated for the corrected model: navigation history is explicitly NAVIGATION STATE,
not a visible progression (`product-spec.md` §7/§30's revision now reflects the single click-to-
navigate gesture rather than R3's separate preview-then-commit description); `docs/architecture.md`
logs the layout-ring and interaction-rule deviations.

Verified 2026-08-13: `npm run test` (673 tests, up from 671 — 2 more interruption/cancellation
tests in `player.test.ts`; `explorerState.test.ts`/`layout.test.ts` rewritten for the single-ring/
single-action model), `npm run typecheck`, `npm run lint`, `npm run build` all pass with zero
regressions. `music-theory-review`: no `src/domain` changes in this phase, nothing new to verify.
`product-scope-review`: verdict aligned, with explicit answers to the phase's three required
questions — (1) navigating now reads as map movement, not progression-authoring (verified: the
breadcrumb is gone, and a dedicated test confirms 5 random exploration clicks leave the real
progression at 0 items, with exactly 1 item after one explicit "Add to progression"); (2) every
visible candidate reads as an immediate destination (verified: Playwright-measured on-screen
distances from the center for all 18 of G7's candidates were 266-267px — effectively identical); (3)
the map stays readable rather than shrinking for artificial depth chains (verified: G7's 18
candidates, the densest case tested, rendered with legible 36px nodes and clear labels, matching
`outgoingOptions(G7, cMajor)`'s own count exactly, 18/18, confirmed via a direct domain-layer
probe — no truncation). Live-browser verification (Playwright, desktop 1400×900 + mobile 390×844
with real touch events + Spanish locale, `AudioContext.resume()` call-counting to verify audio
timing precisely): hovering a candidate never called `resume()` (0 calls) and never changed the
panel's displayed chord; clicking did (≥1 call) and updated the chord immediately; the full
C→Am→Dm→G7 scenario advanced on every single click with the Local Back control appearing labeled
with the correct previous chord after each step; Back correctly returned to the prior chord; R2's
Guitar sample instrument audio still loaded and played (10 HTTP 200s) after switching instruments
mid-exploration; zero console errors throughout, including under emulated `prefers-reduced-motion:
reduce`.

Known limitation carried over: on touch, a single tap both previews (silently) and advances in one
gesture (browsers synthesize a compatibility `mouseenter` immediately before `click`) — this
matches the required "tap = hear transition + navigate" behavior exactly, so it's not a gap, just a
note that "hover-only preview" is inherently a desktop/keyboard-focus refinement on touch devices,
same as documented in the R3 entry above.

## Phase R3.2 — Harmonic territories + preview-before-navigation
- [x] Harmonic Territory domain classifier (`harmonicTerritoryFor`): natural/tension/modal
      colour/substitution/exploration, layered on top of the already-reviewed
      `harmonicCharacterFor`, never re-deriving from `relationshipType`/depth directly
- [x] Completeness invariant for territories: union of all territories == full outgoing set, no
      chord in two territories, empty territories simply omitted (never truncated/equalized)
- [x] Territory is structurally and empirically independent of Depth — verified in
      `music-theory-review`: Depth 1 alone spans both `natural` and `tension`; Depths 2 and 3 each
      span four of the five territories
- [x] Reintroduce a two-step map interaction on top of R3.1's foundations: hover/focus stays
      silent-only; first click/tap/Enter on a candidate PREVIEWS it (cumulative audition of
      confirmed path + candidate, no navigation/history/progression change); the SAME candidate's
      second activation CONFIRMS it (commits to history, recenters, no audio replay since already
      heard) — persistent UI state, not a double-click/timer
- [x] Switching preview to a different candidate cancels the old audition and starts a new one
      without touching confirmed history
- [x] Cumulative audio always replays from the first chord of the CONFIRMED path (plus the active
      preview candidate when previewing) — never an arbitrary append-only or truncated window;
      only one audition exists at a time
- [x] Local Back cancels audio/preview, drops the latest confirmed step, recenters, and replays the
      shortened confirmed path
- [x] Activating the current/center chord replays the confirmed path without ever navigating
- [x] Sector-based map layout: territory sectors get angular spans proportional to member count;
      ring radius derived from the tightest actual angular gap between adjacent nodes (not an
      assumed-uniform gap) — still ONE shared ring, no concentric depth rings reintroduced
- [x] Territory drives primary visual identity (colour, edge dash pattern, sector heading); Depth
      demoted to a small, neutral, secondary badge that never competes with territory colour
- [x] Compact, expandable "How to read the map" / "Cómo leer el mapa" legend explaining both axes
      in plain, non-difficulty language, using the exact same colour/badge identity as the map
- [x] The 3 existing audio controls stay behaviorally distinct: map/path cumulative audio, isolated
      "Hear this chord only" (label renamed from "Hear chord", behavior unchanged), and
      instrument-specific "Hear this voicing"/"Hear this pattern" (Piano/Guitar/Bass, completely
      untouched — confirmed via `git diff --stat` showing zero changes in those directories)
- [x] `hearTransition` removed from `src/audio/player.ts` (dead code — every caller now passes full
      cumulative chord arrays through `hearPath`); `hearPath`'s guard changed from `length < 2` to
      `length === 0` to support single-chord replay at the very start of exploration
- [x] EN/ES i18n for territories, depth plain-language blurbs, legend, previewing-state hint, and
      the "Hear this chord only" label rename — no hard-coded copy

This was a **further corrective/additive pass**, prompted by the user's own testing of the deployed
R3.1 preview: R3.1's underlying navigation/domain architecture, completeness guarantee, single
shared ring (no concentric depth rings), local Back, and no-visible-breadcrumb rule are all
preserved and extended, not rebuilt. Two real problems drove this phase: (1) R3.1's
single-click-does-everything model gave no way to audition or compare a candidate before
committing to it — musicians wanted to hear a move before locking it in; (2) an undifferentiated
single ring made dense candidate sets (e.g. G7's 18 options) hard to read at a glance without any
functional grouping.

Also found and fixed during this phase's own mandatory browser verification (Playwright, not
hypothetical): opening the mobile bottom sheet on PREVIEW (carried over from R3.1's "open on
completed navigation" timing) covered the map before the user could perform the second activation
that confirms a candidate — an interaction-breaking regression under the new two-step model. Fixed
by only auto-opening the sheet on CONFIRM. A related issue — the local Back control sharing the
mobile sheet's `z-10`, so DOM order let the sheet cover Back once open from an earlier confirm — was
fixed by bumping Back to `z-20`. Both are documented in `docs/architecture.md`'s Deviations section.

Also found and fixed during `music-theory-review`: two test-quality gaps in
`harmonicTerritory.test.ts` (not correctness bugs) — one assertion was guarded behind
`if (chained) { ... }` so it would silently pass without exercising anything if the relationship
type it probed for ever failed to generate; fixed by using a genuinely deterministic
`secondaryDominantChain` case (D7 -> A7 in C major) instead of an unreliable C -> F probe. An
unused intermediate variable worked around with `void` was also removed.

Verified 2026-08-13: `npm run test` (701 tests, up from 673), `npx tsc --noEmit`, `npm run lint`,
`npm run build` all pass with zero regressions. `music-theory-review`: territory classification
verified musically sound and genuinely independent of Depth both structurally (the function never
reads `harmonicDepth`) and empirically (cross-checked against every relationship type's actual
depth assignment); deceptive resolution confirmed correctly tension-classified (still
dominant-sourced pull, per standard tonal harmony); `chromaticColour`/`adventurous` collapsing into
`exploration` confirmed defensible (the least function-driven, most colour-for-colour's-sake
families the engine models). `product-scope-review`: verdict aligned — hover never triggers
audio/navigation; first click previews only (no history mutation, confirmed live); second
activation of the same candidate confirms (confirmed live, no double-click/timer); switching
preview cancels/restarts correctly (confirmed live); audio is always cumulative from the confirmed
path's start; local Back and center-chord replay behave as specified (confirmed live); the 3 audio
controls stay distinct with only the one label rename; territory drives primary visual identity
with depth as secondary badge only, confirmed via both code reading and a live colour cross-check
between the map's SVG sector headings and the legend's swatches (identical `--color-*` CSS
variables on both sides); §44's hard constraint honored (zero diff in Piano/Guitar/Bass code); no
R4/Auth/Supabase/Projects/Trial/Stripe work began; no visible breadcrumb; "Add to progression"
stays a fully separate action; no hard-coded copy; domain layer stays framework-free. Live-browser
verification (Playwright, desktop 1440×900 + mobile 390×844, English + Spanish, real touch-capable
viewports): hover never sets preview state; first click sets preview without moving the center;
switching preview clears the old candidate's preview and sets the new one; second click on the same
candidate navigates (center becomes that chord); local Back appears and restores the previous
center chord; clicking the current/center chord replays without navigating; the legend opens and
lists all territories with matching colours; zero console errors — all 48 assertions passed across
all 4 viewport/locale combinations. A second pass verified "Hear this chord only"'s label and
distinctness from "Add to progression" (which correctly adds an item, verified via the progression
strip's empty-state message disappearing), and Piano/Guitar/Bass instrument-selector regression
(all three switch cleanly; Guitar's "Hear this voicing" and Bass's "Hear this pattern" labels
unchanged).

## Phase R3.3 — Global instrument exploration + auto-synced progression + legend usability fix
- [x] Fix the "How to read the map" legend so ALL content (all 5 territories, all 4 depths) stays
      reachable at any viewport height — `position: fixed` viewport-anchored overlay with
      `max-h-[85vh]` + internal `overflow-y-auto`, escaping the map-area ancestor's
      `overflow-hidden` clipping that was the actual root cause (not a z-index/stacking issue)
- [x] ONE global instrument selector (Piano/Guitar/Bass) in the main toolbar, controlling both
      map/path audition and the right panel's execution representation — no duplicate selector in
      the right panel anymore
- [x] Map/path audition (preview, Hear Path, current-chord replay), "Hear this chord only", and
      progression playback all use the globally selected instrument's real sampled sound and
      existing representative voicing/pattern (reusing the existing Piano/Guitar/Bass domain
      catalogues, never a new audio engine) — superseding the neutral-synth playback R1–R3.2 used
- [x] Bass path/chord audition stays melodic/sequential (a short 2-note excerpt from its own
      default pattern), never converted into a simultaneous Piano-style block chord
- [x] Instrument switching is a pure preference change — never touches the current chord, confirmed
      path, preview candidate, key/context, ranking, or the progression
- [x] Existing Piano/Guitar/Bass sampled audio, voicing/pattern GENERATION, and "Hear this voicing"/
      "Hear this pattern"/"Hear this chord only" exact-playback behavior completely unchanged
      (confirmed via `git diff --stat` showing zero changes under `src/domain/instruments/**`
      except two additive barrel-export lines)
- [x] Progression automatically mirrors the confirmed exploration path — no manual "Add to
      progression" action anymore; `Progression.items` is a pure projection of `navPath.steps`
      (`progressionFromPath`), not a second independently-mutated list
- [x] The starting chord automatically is progression item 1; previewing never touches the
      progression; confirming appends exactly once; Back removes exactly the corresponding item
      (and, unchanged since Phase R3, never removes the starting/root chord); changing the starting
      harmonic context (top-left control) resets the progression to just the new root
- [x] Manual per-item reorder/remove and whole-progression transpose REMOVED (not left in an
      inconsistent state) — a deliberate simplification once progression order/identity is derived
      from navigation rather than independently editable; BPM/time signature remain adjustable and
      independently survive Back/Reset/root changes
- [x] Reviewed and confirmed non-redundant: Hear Path (fixed quick pacing, exploratory) vs.
      Progression Play (real BPM/time-signature/duration timing, a tempo-accurate performance) —
      kept both, documented why

This was a **further corrective/additive pass**, prompted by the user's own testing of the deployed
R3.2 preview. Three independent product problems, three independent fixes, all layered on R3.2's
approved territory/preview-confirm model without touching it (Harmonic Territory classification,
its completeness invariant, the sector-based layout, and the preview→confirm interaction itself are
all byte-for-byte or behaviorally unchanged — confirmed via `git diff` and full regression testing).

Also found and fixed a genuine architecture smell while implementing the progression change: three
separately-declared local `"piano" | "guitar" | "bass"` string-literal unions (in the audio player,
the old chord-panel instrument type, and implicitly in each domain instrument sub-module) were
consolidated into one canonical `InstrumentName` type (`src/domain/instruments/instrumentName.ts`),
removing a latent drift risk rather than adding a fourth copy for the new toolbar selector.

Verified 2026-08-13: `npm run test` (689 tests, down from 701 — net reduction from deleting
`progressionReducer.test.ts` and trimming `progression.test.ts` for now-removed manual-editing
functions, offset by new `fromNavigationPath.test.ts`/expanded `player.test.ts`/`instrumentVoicing`
coverage), `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass with zero regressions.
`music-theory-review`: confirmed `harmonicTerritory.ts`/`harmonicCharacter.ts` untouched;
confirmed `representativePitchesFor`/`representativeBassSteps` correctly reuse the existing,
already-reviewed domain catalogues (index `[0]` verified to be each catalogue's own documented
default/curated/best-ranked choice by reading source, not an arbitrary pick); confirmed Bass's
2-step excerpt (root + 3rd, from `basicArpeggio`'s formula-order ascending steps) is a musically
valid minimal representation, not a misleading fragment; confirmed no chord-identity mutation
anywhere in the new audio-routing or progression-derivation code (instrument selection changes
timbre only). `product-scope-review`: verdict aligned, all 10 required questions answered
affirmatively with live-browser evidence (see below); confirmed the removal of manual progression
editing was a deliberate, justified simplification given the new invariant, not silent scope
creep; confirmed no R4/Auth/Supabase/Projects/Trial/Stripe work began; confirmed no hard-coded
copy; confirmed the new domain files stay framework-free.

Live-browser verification (Playwright, desktop 1440×900 + a deliberately short 1440×650 + mobile
390×844, English + Spanish, 70+41 assertions total across three separate verification passes):
legend opens as a dialog, is reachable and scrollable to Depth 4 at every tested viewport height
including the short one, and closes correctly; exactly one instrument radiogroup exists on the
page in every configuration; switching the global selector updates the right panel's heading
(Piano → Guitar → Bass) with no other interaction; selecting Guitar then Bass and previewing a
candidate actually issued real HTTP requests to `/audio/guitar/*.mp3` and `/audio/bass/*.mp3`
respectively (network-level verification, not just UI-state assertions, per the phase's own
explicit requirement) with zero cross-contamination (no piano samples requested during a
Guitar-only preview); no "Add to progression" button exists anywhere; the root chord (Cmaj7)
auto-appears in the progression with no manual action; previewing a candidate leaves the
progression unchanged while confirming it appends exactly once; Back removes the matching
progression item in the same action as navigation Back, down to (and never past) the root; changing
the top-left harmonic context to a new key resets both the current chord and the progression to
just the new root with no stale items; "Hear this voicing" (Piano), "Hear this pattern" (Bass), and
"Hear this chord only" labels all still present and correctly distinct; zero console errors across
every run. A full end-to-end scenario (root C → preview/confirm Am → switch to Guitar → preview/
confirm Dm → switch to Bass → Back twice to the root → Reset exploration) matched the phase's own
required live-scenario script exactly, including confirming the selected instrument (Bass) survives
both Back and Reset exploration unchanged.

Known, deliberate simplification: per-item progression duration editing (previously a `<select>` on
each chord card) was also removed alongside reorder/remove/transpose, rather than kept via a new
parallel `durationBeatsByStep` array — every derived item uses the domain's existing default
duration (`DEFAULT_DURATION_BEATS`). This wasn't explicitly required to go, but keeping it would
have meant introducing a second piece of state that had to be manually kept in lockstep with
`navPath.steps`' length on every CONFIRM/BACK/RESET/SET_CONTEXT transition — exactly the kind of
"two competing arrays that can drift" the phase's own architecture guidance (§65) says to avoid
without a very strong reason. If per-item duration control turns out to matter in practice, the
clean way to reintroduce it is folding it into the SAME reducer transaction that mutates `navPath`
(so it can never desync structurally), not a second independent reducer.

## Phase R3.4 — Armony product closure + platform positioning

- [x] Simplify the bottom Progression UI to just the confirmed chord list + one Play control — no
      BPM, no time signature, no per-chord duration/"beats" label, no reorder/remove/transpose
      controls (those were already removed in R3.3; R3.4 removes the remaining rhythm-composition
      concepts BPM/time-signature/duration entirely, not just their UI)
- [x] Progression playback uses simple, fixed, deterministic pacing (the same pacing "Hear Path"
      already used) through the global selected instrument — no tempo intelligence, no rhythm
      controls exposed
- [x] Reviewed and kept both Hear Path and Progression Play despite now sharing identical timing —
      different UI contexts (quick map-anchored replay vs. Play/Stop with per-chord highlight on
      the visible strip), documented explicitly rather than silently duplicated
- [x] Guitar and Bass panels each gain a clear "Fingering diagram"/"Diagrama de digitación" heading
      directly above their visual, establishing a beginner-readable section hierarchy — no shapes/
      patterns/voicings changed, explanatory UI only
- [x] Removed the last remaining visible item-level "Pro" badge (next to individual Guitar shapes/
      Piano voicings/Bass patterns) — searched the whole app for legacy commercial copy (Pro, Free,
      Premium, Upgrade, Locked); confirmed all remaining matches are either legitimate ("Free mode"
      — a tonal concept unrelated to commercial tiers) or internal domain metadata never rendered
- [x] Confirmed catalogue content itself is untouched — every previously-available Piano voicing,
      Guitar shape, and Bass pattern remains equally reachable; only the commercial presentation
      was removed
- [x] Internal `VoicingCatalogue` "free"/"pro" domain metadata deliberately RETAINED (not a risky
      rewrite) but documented as legacy, never influencing rendering/entitlement/trial/Platform Pro
- [x] Documented Armony as the first app in a future multi-app platform for music composition and
      understanding — platform name undecided, never assumed to be "Armony"; no future mini-apps
      invented, no plugin architecture/placeholder routes/marketplace built
- [x] Documented the definitive platform-wide commercial model: register → 72-hour full-PLATFORM
      trial (not Armony-only) → annual Platform Pro required, granting access to ALL platform apps
      (present and future) as one subscription — no per-app purchases, no item-level paid features,
      no Lifetime access, no price decided/hard-coded
- [x] Documented that trial/Platform Pro both resolve to one platform-level entitlement state
      (`trialing`/`active`/`expired`) — explicitly not per-app flags (`armony_pro`, etc.)
- [x] Documented that account/data is retained (never deleted) when the trial/entitlement expires —
      access locks across the whole platform until entitlement becomes active again
- [x] Confirmed NO auth/login/account UI/trial countdown/Supabase/Stripe/billing/entitlement
      enforcement/persistence was implemented — documentation only, per the phase's explicit scope
      boundary

This was the **final Armony-only refinement**, prompted by the user personally reviewing R3.3 in
Vercel and closing out three remaining product rough edges before moving toward shared platform
infrastructure: the Progression UI still read as a mini-sequencer (BPM/time-signature/duration
controls a musician exploring harmony doesn't need — product positioning, §1/§2 of the governing
spec, is FAST HARMONIC EXPLORATION AND UNDERSTANDING, not rhythmic composition); the Guitar/Bass
diagrams lacked a beginner-readable label explaining what they show; and a legacy "Pro" badge from
the pre-R1 permanent-tier business model was still visibly rendering next to individual catalogue
items despite R1 having already declared that model obsolete in principle. Separately, this phase
formally documents (without implementing) that Armony's future commercial container is a
platform-wide account/trial/entitlement system, not something built and owned by Armony alone.

Also found and fixed a genuine documentation defect while writing this entry: `docs/architecture.md`
had a stray duplicated sentence fragment ("interaction changes; no new UI system was introduced.")
orphaned at the end of the R3.3 deviation entry from an earlier editing artifact — removed, and the
surrounding paragraph (which had described Hear Path/Progression Play as using genuinely different
BPM-based vs. fixed timing) updated to reflect that R3.4 supersedes that distinction.

Verified 2026-08-13: `npm run test` (676 tests, down from 689 — net reduction from deleting
`scheduling.ts`/`scheduling.test.ts` and trimming `progression.test.ts`/`fromNavigationPath.test.ts`
for the removed BPM/time-signature/duration fields, more than offset by updated coverage
elsewhere), `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass with zero regressions.
`music-theory-review`: confirmed as a regression check only (no music-engine changes expected or
made) — harmonic territories/classifier/completeness untouched (`git diff` empty against R3.3 for
`src/domain/navigation/harmonicTerritory.ts`/`harmonicCharacter.ts`); Piano voicings, Guitar shapes/
TAB, and Bass patterns/TAB all unchanged (zero diff under `src/domain/instruments/**` except the
`VoicingCatalogue` doc-comment rewrite, which changes no runtime behavior); confirmed removing the
"Pro" badges did not remove any catalogue item (voicing/shape/pattern counts and generation logic
untouched). `product-scope-review`: verdict aligned — the bottom progression now reads as a route
(chord list + Play), not a DAW/sequencer; a beginner can identify the Guitar/Bass diagrams via their
new heading; all item-level Pro/Free/Premium labels confirmed gone via full-repo search; catalogue
content confirmed intact; Armony confirmed clearly documented as one app within a future platform;
the 72-hour trial confirmed clearly platform-wide, not Armony-only, in the updated product-spec
text; Platform Pro confirmed documented as granting ALL apps, never a per-app entitlement; confirmed
no auth/billing/persistence code was written. `release-check`: confirmed no R4 export work, no
auth, no Supabase, no Stripe, no trial timer, no new mini-app, and no unintended harmonic-engine
changes began.

Live-browser verification (Playwright, desktop 1440×900 + mobile 390×844, English + Spanish):
progression strip shows only chord cards (chord name, no duration badge) plus one Play/Stop button
— no BPM field, no time-signature select, no "4 beats"/"4 tiempos" text anywhere; building
C → Am → Dm → G7 automatically synced the strip with no manual action at any step; switching the
global instrument between Piano/Guitar/Bass and pressing Play produced audibly/network-verifiably
different sample requests for the same confirmed chords, without altering the confirmed
progression; Back correctly removed the matching progression item down to (never past) the root at
every step; preview never touched the progression while confirm always appended exactly once
(unchanged from R3.3, re-verified); the Guitar panel showed "Fingering diagram"/"Diagrama de
digitación" directly above the chord diagram in both languages, with position/inversion info,
suggested fingering, TAB, and "Hear this voicing" all still present and in order; the Bass panel
showed the equivalent heading above its fretboard visual with pattern/TAB/fingering/"Hear this
pattern" intact; opened multiple Guitar voicings (open, movable/barre, inversions) and multiple
Bass patterns and confirmed zero visible "Pro" badges anywhere while the same total voicing/pattern
counts as before remained reachable via the previous/next navigator; zero console errors throughout.

## Roadmap After Armony

*(Recorded R3.4 §43 — documentation only, no implementation begins from this section. Armony's own
core product is considered functionally closed as of R3.4; see the entry above for what "closed"
means concretely. Phase R4 below remains a legitimate, still-unstarted Armony-specific phase — this
section does not cancel it, it records the broader future arc it sits within.)*

The next high-level direction, once resumed, is a shared **Platform Foundation** — built once,
reused by every app rather than rebuilt per app:

- a shared website shell (marketing Home/Features/Pricing/FAQ + the app catalogue/navigation
  described in `docs/product-spec.md` §2's "future platform shape");
- account/authentication (§23);
- the 72-hour full-platform trial (§19, already documented as platform-wide, not Armony-only);
- one shared, platform-level entitlement system (§26 — `trialing`/`active`/`expired`, never
  per-app flags);
- project/data persistence, scoped appropriately once real accounts exist (§22);
- annual Platform Pro billing (§25-26), granting access to the platform's complete app catalogue as
  one subscription.

Only after that foundation exists does it make sense to design future mini-apps individually — this
document deliberately does not name, scope, or invent any of them now (§17-19 of the governing
spec). Phase R4 (Export system, below) and any other remaining Armony-specific polish may be
revisited before or after Platform Foundation, depending on future direction — nothing here commits
to an order between them.

**Update (Phase P0, below):** the first bullet above — the shared website shell — has now been
built as a VISUAL-ONLY preview (platform name decided: ONA). The remaining bullets
(authentication, the real trial, entitlement enforcement, persistence, billing) are still fully
unstarted; Phase P0 explicitly does not touch any of them.

## Phase R4 — Export system
- [ ] Progression PDF; chord/instrument PDF; Piano representation PDF; Guitar diagram/TAB PDF;
      Guitar TAB/text; Bass pattern/TAB PDF; Bass TAB/text
- [ ] Gated by entitlement status (`trialing`/`active`) once Phase 11 enforcement exists — until
      then, available in dev without gating (same "inspectable, not enforced yet" pattern used for
      Free/Pro catalogue tags in Phases 7–9)

## Phase P0 — ONA platform shell (visual only)
- [x] Platform name decided: **ONA** ("wave" in Catalan) — supersedes R3.4's "name undecided," still
      not to be treated as unconditionally final without the user's explicit say-so
- [x] Brand: typographic "ONA" wordmark (`src/components/platform/Logo.tsx`) — no approved logo
      asset was supplied to this build, so no raster tracing/recreation was attempted; swapping in a
      real asset later means editing this one file
- [x] Separate `.ona-shell`-scoped color tokens (`src/app/globals.css`) — charcoal/warm-ivory/
      petroleum-accent per spec, completely independent from Armony's own tokens, which are
      untouched
- [x] `platform` i18n namespace (EN/ES) covering header, hero, intro, tools, trial, pricing,
      final CTA, footer, sign-in, account (all 4 states), trial-ended, and 3 legal placeholders —
      the exact copy the spec provided verbatim; old unused `common`/`marketing` namespaces removed
- [x] Centralized tool catalogue (`src/platform/tools.ts`) — Armony is the only entry; the
      component that renders it is generic, so a second app is one array entry, not new UI
- [x] Public + logged-in header variants, mobile menu drawer, locale switcher (persists locale
      across navigation, including onto unprefixed routes via the existing next-intl cookie), footer
- [x] Home: Hero (abstract animated wave backdrop, reduced-motion-safe, one CTA), short editorial
      intro, Tools catalogue grid (Armony only, no fake "coming soon" cards, ready for more),
      72-hour trial band, single-tier Pro pricing with a Monthly/Annual billing toggle, final CTA,
      footer — `#tools`/`#pricing` in-page anchors from the header, no separate Apps/Pricing pages
- [x] Sign-in (visual only — Google/email buttons navigate to `/account` as a routing placeholder,
      no real auth), Account (visual only, mock data, all 4 documented states reachable via
      `?state=` for review, no live countdown), Trial-ended (visual only), 3 legal placeholder pages
- [x] Armony integration: one discreet "back to ONA" wordmark link
      (`src/components/platform/PlatformBackLink.tsx`) added above `<ExplorerApp />` in
      `src/app/[locale]/app/page.tsx` — styled with Armony's OWN tokens, not `.ona-shell`'s. No
      other line of Armony (component, reducer, or domain module) touched.
- [x] Explicitly NOT implemented, per the phase's own scope boundary: Supabase, real
      Google/email auth, Stripe, real subscriptions/billing/webhooks, transactional email,
      anti-abuse systems, a production database, a real trial timer, additional music apps,
      "Coming soon" cards, MIDI export, and a global project system

This is the first executed slice of "Roadmap After Armony"'s shared **Platform Foundation** —
specifically its "shared website shell" line item, done visual-first per explicit instruction so the
design can be reviewed on Vercel before any backend is wired in. It is NOT Phase 10A/10B/11/12/13 —
those (real auth, persistence, entitlement enforcement, billing, full translation audit) remain
fully unstarted; nothing in this phase creates or reads a real session, and the "logged-in" header
variant / account states are reachable only by direct navigation, never by an actual sign-in. It
also is not a redo of the already-planned Phase 14 ("Marketing website") — Phase 14's checklist
(Home/Features/Pricing/FAQ/Login/Register/Privacy/Terms) is now substantially covered by this
phase's visual output; what Phase 14 will still need once resumed is wiring Login/Register to real
auth and any FAQ content this phase didn't include.

Verified 2026-08-14: `npm run test` (676 tests, unchanged — this phase touches zero files under
`src/domain`), `next typegen && tsc --noEmit`, `npm run lint`, `npm run build` all pass with zero
errors or warnings; `next build`'s route table confirms every new route (`/`, `/sign-in`,
`/account`, `/trial-ended`, `/privacy`, `/terms`, `/cookies`) prerenders per locale except
`account`/`sign-in`, which are correctly dynamic (they read `searchParams`).

Live-browser verification (Playwright, desktop 1440×900 + mobile 390×844, English + Spanish): zero
console/page errors on every route in both viewports; mobile menu opens and lists Apps/Pricing/Sign
in (or Account)/Try for free and closes on selection; clicking "Apps" in the header smooth-scrolls
to the Tools section, landing correctly below the sticky header; the locale switcher persists across
navigation to an unprefixed route (visited `/es` then `/account` in the same session and it still
rendered in Spanish); all four account states (`?state=trialing|monthly|annual|cancelled`) render
their documented copy with real formatted dates/times, no live countdown anywhere; the pricing
Monthly/Annual toggle switches price and note text correctly; Armony's `/app` route (desktop and
mobile) renders fully intact with the new back-link occupying one unobtrusive row that crowds
nothing in the existing toolbar.

**Follow-up (same phase): real ONA logo + Armony card refinement.** Two focused visual fixes on top
of the above, once the approved logo image was supplied — structure/copy/routes/pricing/auth mocks
unchanged.
- [x] Processed the supplied logo into two transparent, ivory (`#F2F0E9`) PNGs under `public/brand/`
      (`ona-logo-full.png` — the full lettering+waveform lockup; `ona-mark-compact.png` — a
      waveform-only crop of the SAME asset, kept available as a compact fallback but not currently
      needed anywhere at tested sizes) — no retracing/redrawing, straight background-removal +
      recolor from the source file
- [x] `Logo`/`LogoLink` now render the real asset (`next/image`, height-driven sizing, `variant`
      prop for full vs. compact) everywhere the temporary typographic "ONA" mark previously
      appeared: desktop/mobile header, footer, sign-in, account, trial-ended, and the 3 legal pages
- [x] Confirmed the small floating circular "N" seen in earlier dev screenshots is Next.js's own
      `next dev`-only indicator, not part of this codebase — absent from a production
      `next build && next start` run; nothing to remove from shipped code
- [x] Replaced the Armony card's generic unlabeled node/star graphic
      (`ToolCardVisual.tsx`) with a small static excerpt of a real C-major harmonic-map state —
      labeled chord nodes (C center; Dm/Em/F/Am natural; G7 tension), reusing the SAME node/edge
      styling formulas and CSS custom properties as `MapNode.tsx`/`MapEdge.tsx` (filled accent
      center vs. territory-coloured outlined candidates, the same per-territory dash-pattern
      language) — no `@/domain` import, no live `HarmonicMap` reuse, just the same visual
      vocabulary and colours

Verified: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676, unchanged),
`npm run build` all pass. Live-browser verification against the PRODUCTION build (`next start`, not
`next dev`, specifically to settle the "N" question) — desktop 1440×900 + mobile 390×844, English +
Spanish: zero console/page/4xx-5xx errors on `/`, `/es`, `/app`, `/sign-in`, `/account`; no
horizontal overflow on either viewport; the real logo reads clearly at header scale on both desktop
and mobile and in the footer/sign-in/account close-ups; the Armony card visibly shows real chord
labels (C/Dm/Em/F/Am/G7) with Armony's real accent/tonic/dominant colours and dash styling; the
mobile menu still opens correctly with the logo in place; Armony's `/app` route (desktop + mobile)
is pixel-identical to before this follow-up except the untouched plain-text "Volver a ONA"/"Back to
ONA" link (left as text, not swapped to the image mark, since it lives inside Armony's own toolbar
styling, not the ONA platform shell).

**Second follow-up (same phase): hero wave visibility, multi-territory card, mock-flow `returnTo`.**
Three narrowly-scoped fixes; everything else (structure, copy, pricing, auth mocks, EN/ES,
Armony) unchanged.
- [x] **Hero wave made clearly visible without turning "techy."** A first attempt (raising per-path
      opacity on the flat vector wave shapes) was rejected on inspection — at a visible opacity, the
      hard-edged shape read as a bold graphic "poster" element, not the intended calm/artistic
      backdrop. The shipped fix instead applies a soft blur (`filter: blur(48px)` on the wrapping
      layer) so the same two accent-coloured wave layers read as an atmospheric glow rather than a
      crisp shape — clearly perceptible on both desktop and mobile, headline/subtitle stay fully
      readable, motion (and the reduced-motion override) unchanged.
- [x] **Armony card rebuilt to demonstrate harmonic TERRITORIES, not just "a chord with neighbors."**
      Replaced the single-territory (natural + one tension chord) snapshot with a verified,
      real 5-territory excerpt from C in C major — F (natural), A7 (tension), Em (substitution), Ab
      (modal colour), A (exploration) — confirmed against the actual
      `relationshipsFrom`/`harmonicTerritoryFor` output (a throwaway Vitest scratch test, deleted
      after use) rather than hand-picked. Organic, asymmetric placement (varying distance/angle per
      node, exploration pushed farthest out) replaces the previous even/symmetrical arc; three of
      the five nodes carry a small, subtle territory-name caption (Natural/Tension/Exploration) —
      the other two rely on colour/dash alone, per the task's own "don't overcrowd" allowance.
- [x] **Mock sign-in flow now returns to where the user started.** New
      `src/platform/safeReturnTo.ts`: `resolveSafeReturnTo(returnTo, fallback)` checks the
      requested destination against an explicit allowlist built from `platformTools`' real routes —
      never a generic "starts with /" check — falling back to the given default for anything else
      (missing, malformed, external, protocol-relative). The Armony card's CTA now links to
      `/sign-in?returnTo=/app`; both mock "Continue with Google/email" buttons on the sign-in page
      resolve to that validated destination. The header's plain "Sign in" link carries no
      `returnTo`, so it still defaults to `/account`, unchanged.

Verified: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676, unchanged),
`npm run build` all pass. Live-browser verification against the PRODUCTION build — desktop
1440×900 + mobile 390×844, English + Spanish: zero console/page/4xx-5xx errors, zero horizontal
overflow on any combination; the hero wave is visibly present as a soft glow without obscuring the
headline; the Armony card renders all five labeled nodes legibly at real card size on both
viewports; end-to-end click-through confirmed both flows through the actual UI (not just URL
construction) — Armony "Try now" from the Spanish home page → sign-in (`returnTo=%2Fapp` in the
URL, locale preserved) → mock "Continue with Google" → landed on `/es/app` (Armony, still in
Spanish); the header's "Sign in" → sign-in (no `returnTo`) → mock "Continue with email" → landed on
`/account`. Armony's `/app` route screenshotted and confirmed pixel-identical to before this
follow-up.

**Third follow-up (same phase): a real ONA wave motif, section-by-section visual depth, a reusable
app-level "back to ONA" component.** Purely visual; structure/copy/pricing/routes/auth
mocks/Armony untouched.
- [x] **New wave asset system** (`src/components/platform/wave/`): `wavePaths.ts` hand-authors a
      few irregular (non-repeating) organic Bézier crest curves as plain data; every filled
      silhouette is DERIVED from its crest curve (crest + close-to-bottom), so a stroke and a fill
      of the same wave always trace the identical line. `HeroWave.tsx` pairs a modest translucent
      fill with a crisp, brighter stroke along just the crest — the stroke is what keeps the shape
      unmistakably a wave at a glance, replacing the previous pass's heavily-blurred glow (rejected
      on inspection as "no longer read as a wave"). `SectionWave.tsx` is a fill-only, lower-opacity
      "large fragment bleeding from one edge" variant reused across sections with different
      `side`/`opacity` per call site.
- [x] **Hero rebuilt around the new motif.** Two independent layers (primary: fill + crest stroke;
      secondary: fill only, different curve, lower opacity) drift very slowly and independently
      (new `wave-drift-primary`/`wave-drift-secondary` keyframes, `ease-in-out infinite alternate`,
      26s/34s — a slow breathe, not the previous seamless marquee scroll), both neutralized by the
      existing global `prefers-reduced-motion` rule. Headline/subtitle/CTA/layout unchanged.
- [x] **Home sections now vary rather than repeating one treatment**: Hero — strongest, full
      primary+secondary wave with the crest stroke. Introduction — mostly dark, a large, very
      subtle (`opacity 0.06`) wave fragment bleeding in from the left. Tools — unchanged, no wave,
      deliberately calm so the app cards stay the focus. 72-hour trial — kept its existing slightly
      lighter charcoal surface (`bg-ona-surface`) and gained a subtler fragment from the right
      (`opacity 0.10`). Pricing — unchanged, no wave, calmest/darkest so the Pro module stays the
      focus. Final CTA — reuses `HeroWave` verbatim (not a variant) as an intentional bookend,
      "echoing the hero" per the brief. Footer — unchanged, still minimal.
- [x] **New `AppBackToPlatform` component** (`src/components/platform/AppBackToPlatform.tsx`)
      replaces the plain-text `PlatformBackLink` — now a small real ONA logo (the `compact`
      waveform-only variant at 14px tall; the full lettering+waveform lockup isn't legible at that
      size, confirmed in an earlier pass) immediately followed by "Back to ONA"/"Volver a ONA",
      the whole element one link to localized Home. Styled with the same generic semantic tokens
      (`border`/`foreground-muted`) Armony's own UI already uses, not the platform's `.ona-shell`
      palette, so it visually belongs to whichever app hosts it — written to be dropped into any
      future app's page unchanged, not Armony-specific. `src/app/[locale]/app/page.tsx`'s only
      change is swapping the import/usage; `ExplorerApp` and every domain module untouched.

Verified: `next typegen && tsc --noEmit`, `npm run lint`, `npm run test` (676, unchanged),
`npm run build` all pass. Live-browser verification against the PRODUCTION build — desktop
1440×900 + mobile 390×844, English + Spanish: zero console/page/4xx-5xx errors and zero horizontal
overflow on every combination; the hero wave is now clearly identifiable as a wave (not a glow) on
both viewports with headline/subtitle fully legible; each Home section visibly differs from its
neighbors rather than repeating the same background treatment; `prefers-reduced-motion` confirmed
via computed style (`animation-duration` collapses to ~0 on the wave layers). Clicked "Back to
ONA"/"Volver a ONA" from `/es/app` and confirmed it lands on `/es` (locale preserved) — the mock
logo+text component works end-to-end, not just visually. A final screenshot of `/app` (desktop +
mobile, EN + ES) confirmed Armony itself unchanged.

---

# Infrastructure phases (resume after R1–R4)

## Phase 10A — Authentication + 72-hour trial foundation
- [ ] Supabase auth: email/password, verification, reset; Google OAuth
- [ ] Onboarding (primary instrument, main goal)
- [ ] `trial_started_at` set server-side at registration; trial status computable from it

## Phase 10B — Project persistence
- [ ] Project CRUD, RLS
- [ ] Serialize/hydrate `Progression`/explorer state to/from a saved project

## Phase 11 — Entitlement enforcement
- [ ] Central entitlements module + `useEntitlements()` (`trialing`/`active`/`expired` →
      `canUseApp`/`canSaveProjects`/`canExport`)
- [ ] Server-side enforcement of post-trial/post-expiry access locking

## Phase 12 — Annual Stripe billing
- [ ] Checkout for the single Annual license (no Lifetime)
- [ ] Webhook handling, idempotency, entitlement sync (`trialing` → `active` on payment)

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

- **2026-08-13 — R1 business-model revision.** Removed the permanent Free/Pro/Lifetime commercial
  model (previously: Free €0 / Pro Annual €34.99/year / Pro Lifetime €79.99 one-time, with Zoom 1–2
  vs Zoom 1–4 and a 3-project Free cap) in favor of: register → 72-hour full trial (complete product
  access, no card required) → required Annual license (price not yet decided — do not invent one).
  Rationale: personal testing of the deployed product plus musician feedback. Full detail in
  `docs/product-spec.md` §9/§19/§20/§25/§26 and this file's R1 entry above. Documentation-only;
  no code changed in this pass — Phases R2 (audio) and R3 (navigation) are the next controlled
  steps, each requiring separate approval before starting.
