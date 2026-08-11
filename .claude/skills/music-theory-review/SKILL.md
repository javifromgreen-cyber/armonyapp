---
name: music-theory-review
description: Audit changes to the music theory engine, harmonic graph, or instrument representations (guitar/bass/piano) for musical correctness. Use after editing anything under src/domain/{notes,intervals,chords,keys,harmony,graph,instruments}, or before considering such a change complete.
---

# Music Theory Review

Audits musical correctness of changes to `src/domain/**` (notes, intervals, chords, keys, harmony,
graph, instruments) per `docs/music-engine.md`.

## What to check

- **Notes / enharmonic spelling**: is spelling context-aware (respects the active key/preceding
  harmony), not reduced to sharps-only or flats-only? Does a `PitchClass` vs `Note` (spelled)
  distinction stay intact through the change?
- **Intervals**: correct interval naming and arithmetic; no off-by-one semitone errors.
- **Chord formulas / construction / parsing**: does the chord catalogue match product-spec §10
  exactly? Does construction from root+quality and parsing from symbol round-trip correctly? Do
  generated notes match the documented interval formula (e.g. Am7 = A C E G = 1 b3 5 b7)?
- **Scales / keys / scale degrees**: correct diatonic collections for major/minor keys; correct
  relative major/minor pairing.
- **Harmonic functions / relationships**: tonic/predominant/dominant classification; secondary
  dominants resolve to the expected target; borrowed/modal-interchange chords come from a
  plausible parallel mode; tritone substitution is a correct tritone away; diminished passing and
  chromatic mediant relationships are musically justified, not arbitrary.
- **Transposition**: pitch AND spelling transpose correctly (e.g. Cmaj7 +2 semitones → Dmaj7, not
  an enharmonic respelling of D).
- **Zoom 1–4 classification**: does each relationship type land in the Zoom level defined in
  product-spec §8? Is every generated graph edge musically meaningful (never "filler" chords)?
- **Instrument note generation**: do guitar/bass/piano note sets for a chord match the chord's own
  note set exactly — no invented or missing notes?
- **Voicing generation/ranking** (guitar especially): are voicings bounded by realistic fret span,
  finger count, and playability, per product-spec §13? Are rankings sane (open/common shapes rank
  above awkward ones)?
- **Regression tests**: does the change include or update tests per the minimum cases in
  `docs/music-engine.md`? Run them.

## How to review

1. Identify which domain module(s) changed (`git diff` against the relevant `src/domain/**`
   paths).
2. For each musical claim in the diff, verify it against standard tonal harmony — don't trust a
   comment or variable name as proof of correctness.
3. Run the relevant Vitest suite (`npm run test -- <path>` or the full domain suite) and read
   actual output, not just exit code.
4. If a rule's correctness is genuinely ambiguous (e.g. an edge-case borrowed chord, an unusual
   substitution), say so explicitly and propose the test case that would pin it down — do not
   invent a rule to fill the gap.

## Output

Report findings as: file/module, the specific musical claim, why it's right/wrong/uncertain, and
(if wrong) the correct rule with a citation to standard theory or to `docs/music-engine.md`. Flag
missing test coverage separately from correctness bugs.
