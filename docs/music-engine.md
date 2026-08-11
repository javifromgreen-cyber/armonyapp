# Music Engine

The music engine is the framework-free domain layer under `src/domain`. It must be correct before
anything is built on top of it. This document defines module boundaries and the testing bar for
each.

## Module map

- **notes** — pitch classes (0–11), note names, enharmonic spelling rules. Spelling must respect
  context (key/preceding harmony) — never a single sharp-only reduction. Public API works with a
  `Note` type (letter + accidental) and a `PitchClass` (0–11) separately, with explicit conversion
  functions.
- **intervals** — interval arithmetic between pitch classes/notes; naming (m3, P5, etc.).
- **chords** — chord formula catalogue (§10 of product-spec), chord construction from
  root+quality, chord parsing from symbol string, chord-to-notes, chord-to-interval-formula.
- **keys** — major/minor keys, diatonic scale generation, scale degrees, relative major/minor.
- **harmony** — harmonic function classification (tonic/predominant/dominant), secondary
  dominants, borrowed/modal-interchange chords, tritone substitution, diminished passing chords,
  chromatic mediants, transposition of a chord or full progression.
- **graph** — builds the harmonic graph (nodes = chord-in-context, edges = typed relationships)
  and classifies each relationship into Zoom 1–4 per the rules in product-spec §8. Graph
  generation must be driven by the `harmony` module's explicit rules — never hard-coded per node.
- **instruments/guitar** — fretboard model, voicing generation, and a playability ranking
  function (fret span, stretch, finger count, string usage, chord-tone coverage, duplicate notes).
- **instruments/bass** — fretboard model, chord-tone position finder, arpeggio/pattern generator.
- **instruments/piano** — keyboard model, inversion generation, voicing generation.
- **entitlements** — pure `plan -> Entitlements` mapping (no persistence, no network).

Note: `src/audio` (Phase 6, playback) lives OUTSIDE `src/domain` — it depends on Tone.js/Web
Audio, which the domain layer's framework-free rule forbids. Its scheduling/voicing math
(`src/audio/{pitch,scheduling,voicing}.ts`) is still pure and framework-free by the same
discipline as the modules above; only `src/audio/player.ts` touches Tone.js itself, kept as thin
as possible so the musically-meaningful logic stays unit-testable without any audio API.

## Testing bar

Every module above ships with Vitest unit tests before UI is built against it. Minimum cases
(non-exhaustive — expand as chords/relationships are added):

- Key generation: C major → C Dm Em F G Am Bdim.
- Chord construction: Am7 → A C E G (formula 1 b3 5 b7); G7 → G B D F.
- Transposition: Cmaj7 + 2 semitones → Dmaj7 (spelling, not just pitch class).
- Enharmonic spelling: context-dependent (e.g. Db vs C# chosen by key context).
- Harmonic relationships: relative major/minor, secondary dominants (e.g. V7/V in C major → D7),
  a supported substitution (e.g. tritone sub of G7 → Db7).
- Zoom classification: a given relationship type maps to the correct Zoom level, and Free/Pro
  gating (Zoom 1–2 vs 1–4) is enforced by entitlements, not by the graph module itself.
- Guitar voicing engine: generated voicings for a sample of chords are fret-span/finger-count
  bounded and ranked as expected; regression tests pin known-good voicings for common chords
  (open C major, open G major, barre F major, etc.).
- Instrument note generation: guitar/bass/piano note sets for a chord match the chord's own note
  set (no invented notes).

## Non-goals for v1

Advanced voice-leading optimisation, automatic fingering optimisation, and non-deterministic (LLM)
harmonic suggestions are explicitly out of scope for the engine in v1 — see product-spec §21 and
§33.

## Documented assumptions (Phase 2)

Non-obvious rules chosen during implementation, per the "don't guess — write it down" rule in
`CLAUDE.md`:

- **Chord formulas are tertian (stacked-third) by construction.** Every scale-degree token (1, 3,
  5, 7, 9, ...) maps to a fixed letter distance from the root regardless of alteration — degree 7
  is always the 7th letter, whether natural, b7, or bb7. This is why the fully-diminished 7th
  chord (`dim7`, formula `1 b3 b5 bb7`) spells its seventh as a double-flat (e.g. Cdim7 = C Eb Gb
  Bbb) rather than the enharmonically simpler "A". This is the theoretically consistent spelling —
  each note in the chord is a true minor third above the last (C→Eb→Gb→Bbb) — even though many
  fake books simplify it to "A" in practice. `src/domain/chords/chord.test.ts` pins the Bbb
  spelling explicitly.
- **Generic (quality-agnostic) semitone transposition** (`transposeNote` /
  `transposeChord` with a raw semitone count, no target key) spells each semitone distance as the
  smallest plausible generic interval: 1 semitone up is a minor second (C→Db), not an augmented
  unison (C→C#). This only matters when transposing without a target key/letter in mind (e.g. "up
  3 semitones"); transposition driven by an explicit scale degree (chord construction, diatonic
  chords) always uses the correct letter for that degree directly, never this generic table.
- **The tritone (6 semitones) is direction-dependent.** Because 6 + 6 = 12, the tritone is its own
  octave-inversion, so a single fixed letter spelling can't be correct both ascending and
  descending without breaking round-trip transposition. `transposeNote` spells an ascending
  tritone as an augmented fourth (C→F#) and a descending tritone as a diminished fifth (C→Gb),
  which matches common notational convention and keeps `transpose(transpose(x, 6), -6) === x`
  true. See `src/domain/intervals/transpose.ts`.
- **Minor-key diatonic chords use natural minor (Aeolian), not harmonic minor.** `keys/key.ts`
  derives each diatonic triad's quality by stacking thirds within the key's own scale rather than
  a hardcoded per-degree table, so it generalizes correctly to any mode — but for `natural-minor`
  keys today, that means the v (five) chord comes out minor and vii comes out major (e.g. A natural
  minor → Am Bdim C Dm Em F G), not the harmonic-minor-derived V major / vii° diminished that
  gives a minor key its dominant pull. The harmony module (Phase 3) is responsible for layering
  that functional dominant (secondary-dominant-style, borrowing the raised 7th) on top of this base
  scale — it is intentionally not baked into the raw key/scale layer.

## Documented assumptions (Phase 3 — harmony + harmonic graph)

`src/domain/harmony` and `src/domain/graph` implement product-spec §8's relationship families and
§29's graph model. Non-obvious rules and interpretive decisions:

- **14 generator functions, 15 `RelationshipType` tags.** `src/domain/graph/harmonicGraph.ts`'s
  `RELATIONSHIP_GENERATORS` list has 14 entries (one per family module); `types.ts`'s
  `RELATIONSHIP_TYPES` has 15 entries. The difference is `functionalDominantRelationships`, a
  single generator function that emits edges of two distinct types (`functionalDominant` and
  `leadingToneDiminished`) depending on which chord it's describing. Both numbers are correct —
  they're just counting different things.

- **Functional minor without touching the scale.** `functionalMinor.ts`'s `functionalDominant`
  needs no mode branching and no harmonic-minor scale: building a `dominant7`-quality chord on a
  natural-minor key's own (unaltered) 5th scale degree already produces the raised 3rd
  automatically, because chord construction (`../chords`) builds each formula degree relative to
  the given root using its own interval pattern — e.g. `buildChord(E, "dominant7")` gives E G# B D
  regardless of what key E came from. Only the leading tone itself (used for the vii°/vii°7 chord)
  needs an explicit re-spelling (natural-minor's subtonic, raised a semitone, same letter). This is
  the mechanism behind "E7 → Am through G#" in A minor.
- **classifyFunction's degree→function mapping is a deliberate simplification**, applied
  identically to major and natural-minor (1,3,6 = tonic; 2,4 = predominant; 5,7 = dominant). It
  does not distinguish natural minor's *weak* v/VII (minor v, major subtonic VII) from major's
  *strong* V/vii° — that distinction is exactly what the separate `functionalDominant` /
  `leadingToneDiminished` relationship family exists to carry, as additional edges alongside (not
  replacing) the plain diatonic ones. Refining minor-key function labels further (e.g. calling VII
  "subtonic" rather than "dominant") is deferred.
- **Tonic/predominant/dominant relationships are metadata, not a separate edge family.** Rather
  than emitting a redundant third edge to the same target chord, each `diatonic` edge carries the
  target's function in its explanation params. Product-spec §8's "basic tonic, predominant and
  dominant relationships" (Zoom 1) is satisfied by the `diatonic` + `relative` +
  `functionalDominant` families together, not a dedicated relationship type.
- **"Frequent accessible chromatic relationships" (Zoom 2) and "sophisticated chromatic movement"
  (Zoom 3)** from product-spec §8 are not implemented as their own families — they're interpreted
  as already covered by the concrete, named families at those zoom levels (`secondaryDominant` /
  `borrowed` / `substitution` at Zoom 2; `chromaticMediant` primarily at Zoom 3). No edge exists
  whose only justification is "Zoom 2 needs more chromatic content."
- **Cross-family de-duplication.** Several relationship families can independently derive the
  exact same target chord via different (but both musically valid) reasoning paths. Rather than
  show two edges with different labels to the same chord, the more specific/named family wins and
  the more generic one excludes it:
  - `chromaticMediant` and `commonTone` exclude any target that coincides with `borrowed`'s
    canonical set (e.g. C major's bIII, Eb, would otherwise also qualify as a chromatic mediant of
    C — `borrowed` keeps it).
  - In *any* natural-minor key, V7/III (a secondary dominant) and the diatonic bVII7 are
    *mathematically* the same chord — both land a major 7th above the tonic, by construction of
    natural minor's interval pattern, not a coincidence of one key. `secondaryDominant` excludes
    this case; `diatonicSeventh` keeps it.
  - In *any* natural-minor key, the functional leading-tone diminished 7th
    (`functionalLeadingToneDiminished`) and the passing-diminished chord between bVII and i are
    also always the same chord (both "a diminished 7th on the raised leading tone").
    `passingDiminished` excludes this case; `functionalDominant`'s `leadingToneDiminished` keeps
    it.
  - This is verified generically (not just for C major/A minor) — see
    `src/domain/graph/harmonicGraph.test.ts`'s cross-key duplicate-edge checks.
- **Tritone substitution is spelled as the conventional bII7 of the resolution target**, not a
  generic +6-semitone transposition of the source. `transposeChord(G7, 6)` would give C#7 (the
  generic ascending-tritone/augmented-4th spelling from `../intervals/transpose`), but every real
  chart spells G7's tritone sub as Db7 — because it's understood as "bII7 of C" (what G7 resolves
  to), not as an abstract interval from G. `tritoneSubstitution.ts` computes it that way,
  reusing `secondaryDominant.ts`'s `recognizedDominants()`, which pairs each recognized dominant
  with what it resolves to.
- **"Anchored at tonic" families are quality-agnostic, but not root-only.** `relative`,
  `functionalDominant`, `borrowed`, `nearbyKey`, and `distantKey` all only fire from the tonic
  chord. They check via `harmonicFunction.ts`'s `isTonic()` (root pitch class matches scale degree
  1) so they still fire when exploring from Cmaj7, C6, etc. — not only the bare triad — but `isTonic`
  alone is not sufficient: they additionally require `!isRecognizedDominant(source, context)` (from
  `secondaryDominant.ts`), because a chord's root can coincide with the tonic while the chord itself
  is a *different* recognized thing (C7 in C major has root C, but C7 is V7/IV). See "Documented
  assumptions (Phase 3 correctness pass)" below for the bug this fixes.
- **`nearbyKey` (Zoom 3, "nearby modulation relationships") intentionally skips the immediately
  closely-related keys** (dominant, subdominant, relative) because their tonics are, by
  construction, already diatonic chords the Zoom 1 `diatonic` family exposes — a same-chord
  "modulation" edge would just be a relabeled duplicate. It instead goes one hop further along the
  circle of fifths (dominant-of-the-dominant, subdominant-of-the-subdominant, and their relatives),
  which are guaranteed non-diatonic new tonal centers.
- **Guitar/bass/piano-facing families are deliberately absent from this list** — Phase 3 is
  harmony/graph only; instrument representations are Phase 7-9.

## Documented assumptions (Phase 3 correctness pass)

A follow-up review of the initial Phase 3 implementation found that "root position happens to
coincide with the tonic" was being used, in several places, as a stand-in for "this chord IS the
tonic" — which breaks for any chord that is itself a recognized dominant rooted on the tonic
degree (the clearest case: C7 in C major, root C, but musically V7/IV, not tonic-function at all).
Fixes, all covered by regression tests:

- **`secondaryDominantRelationships` had a self-referential bug.** It gated its "list all
  secondary dominants" branch on `diatonicDegreeOf(source, context) === 1` (root is the tonic).
  Since C7's root is C, querying `secondaryDominantRelationships("C7", cMajor)` matched that
  branch and returned all 5 secondary dominants **including a self-loop edge from C7 to itself**,
  instead of recognizing that C7 already *is* one of those five and should only resolve (to F).
  Fixed by additionally checking the source isn't itself one of the targets. The same
  root-coincidence hazard existed in `relative.ts`, `functionalDominant.ts` (the relationship
  file), `borrowed.ts`, `nearbyKey.ts`, and `distantKey.ts` — all of which gated purely on
  `isTonic()`. Each now also excludes `isRecognizedDominant(source, context)`.
  `borrowed.ts` additionally gained a same-target self-loop filter for A minor's Picardy third
  (its only borrowed-chord entry has the same root *and* the same degree spec as the tonic-anchor
  chord itself, so querying from the Picardy chord could otherwise produce a Picardy→Picardy edge).
- **Root-only classification is not enough for a chord's *displayed* function, either.** The
  original `substitutionRelationships` used `harmonicFunction.ts`'s `classifyFunction` (root-only)
  on the *source* chord directly, so `substitutionRelationships("C7", cMajor)` computed C7 as
  "tonic-function" and offered Em/Am as substitutes — as if C7 (a secondary dominant) were
  interchangeable with the plain tonic triad. Fixed by introducing
  `src/domain/harmony/contextualRole.ts`, a fourth, explicitly-separated concept alongside chord
  identity, the diatonic/root functional family, and chord-to-chord relationships:
  - **chord identity** (`Chord`) — root + quality, no context.
  - **diatonic/root functional family** (`classifyFunction`) — root-only tonic/predominant/dominant;
    a simple, always-available fallback, not a claim about what the chord is actually doing.
  - **contextual role** (`contextualRole`) — refines or overrides the root family using the
    chord's actual quality and any already-modeled specific relationship: if the chord's quality
    natively matches the plain diatonic triad or diatonic 7th chord at its root, the root family is
    accurate and used as-is (e.g. G7 in C major really is the diatonic V7); otherwise it checks, in
    order, the minor-key functional dominant/leading-tone chords, recognized secondary dominants
    (returning which degree they target), and borrowed chords; only if nothing more specific
    matches does it fall back to the plain root family (e.g. Csus4 in C major has no more specific
    story, so "tonic" is a reasonable simple fallback — this is the "basic/root-derived family may
    still exist as a simple fallback" requirement). Returns undefined only when the chord's root
    isn't diatonic at all.
  - **relationship to another chord** (`HarmonicEdge`) — unchanged.

  `substitutionRelationships` now requires `contextualRole(source, context)` to be a plain
  tonic/predominant/dominant kind before computing substitutes, and additionally excludes
  same-ROOT targets (not just exact chord identity) — "Cmaj7 substitutes for C" isn't a meaningful
  substitution, just the same root with an extension.

## Documented assumptions (Phase 6 — audio)

- **Beat convention: `ProgressionItem.durationBeats` is always a count of quarter-note beats at
  the progression's BPM, independent of `timeSignature`.** One beat is always `60 / bpm` seconds.
  4/4, 3/4, and 6/8 do not change this math — `timeSignature` is a structural/notational label
  only for v1 (useful later for bar-grouping in a visual/notation feature), not a reinterpretation
  of what "one beat" lasts. In particular, 6/8 does NOT get compound-meter treatment (a beat is
  never read as a dotted quarter here) — that's an explicit v1 simplification, not an oversight;
  revisit only if a feature actually needs bar-relative or compound-meter timing. See
  `src/audio/scheduling.ts`.
- **Neutral playback voicing is a compact close-position stack, not an instrument-accurate
  voicing.** `src/audio/voicing.ts`'s `neutralVoicing` places the chord's root at a fixed default
  octave (4, i.e. around middle C) and stacks each subsequent formula tone at the smallest
  ascending step above the previous tone — this keeps every chord compact (never muddy-low, never
  needlessly spread) without knowing anything about how a guitar/piano/bass would actually finger
  it. Guitar/piano/bass-specific voicing-to-audio playback (Phases 7-9) will generate their own
  `PlayablePitch[]`/MIDI arrays and hand them to the same low-level player functions, not this
  generator.
- **Pitch math uses standard equal temperament** (`src/audio/pitch.ts`): MIDI 60 = C4 = middle C,
  MIDI 69 = A4 = 440Hz, `frequency = 440 * 2^((midi-69)/12)`. Playback deliberately computes raw
  frequencies itself rather than relying on Tone.js's note-name string parser, since the domain
  layer's enharmonic spelling can legitimately produce double-flat/double-sharp note names (e.g.
  the diminished-7th spelling documented above) that a note-name parser may not accept — a
  frequency number sidesteps that entirely.
