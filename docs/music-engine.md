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
