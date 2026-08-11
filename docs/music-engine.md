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
