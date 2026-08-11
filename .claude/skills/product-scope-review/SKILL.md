---
name: product-scope-review
description: Review a substantial feature or UX proposal against Armony's product identity (EXPLORE→UNDERSTAND→HEAR→PLAY→COMPOSE) before or after building it, to catch scope drift toward a generic chord tool, DAW, theory course, or chatbot. Use for non-trivial feature/UX decisions, not tiny fixes.
---

# Product Scope Review

Protects Armony's product identity during development: an interactive harmonic exploration
environment, not a generic chord-progression generator, static chord dictionary, Tonnetz
visualization, music theory course, DAW, or AI chatbot. Reference: `docs/product-spec.md`
(especially §0, §1, §6, §7, §30, §31, §44-45) and the identity block in `CLAUDE.md`.

## What to check

- **Loop integrity**: does the proposal keep Explore, Understand, Hear, Play, and Compose as one
  combined interaction, rather than splitting them into separate modes/screens/tabs?
- **The three-action rule**: does the proposal keep "select a chord", "recenter the map on a
  chord", and "add to progression" as distinct, deliberate user actions? Flag anything that makes
  selection silently mutate the progression, or that conflates exploration with commitment.
- **Harmonic depth vs random content**: if the proposal touches the map, does every new
  edge/relationship have real musical meaning classified into a Zoom level (product-spec §8), or
  does it just add more chords to look impressive?
- **Ceiling check**: does the proposal preserve "easy to start, no harmonic ceiling"? Flag designs
  that are beginner-only (dumbing down the engine) or expert-only (burying the simple path).
- **Identity drift**: does the proposal risk turning Armony into...
  - a generic chord/progression generator (output without exploration or context)?
  - a static chord dictionary (lookup without relationships)?
  - a DAW (arrangement, tracks, mixing, sample libraries)?
  - a music theory course (long lessons, quizzes, curriculum structure)?
  - an AI chatbot (freeform conversational interface replacing the visual map)?
  - an overly complex expert-only tool, or conversely an oversimplified beginner toy?
- **Map visual identity**: does the proposal keep the harmonic map as a navigation metaphor only —
  not a literal geographic map, not a generic force-directed graph dump?
- **Paywall UX**: if the proposal touches Free/Pro gating, does the paywall appear naturally after
  value is delivered (product-spec §31), rather than blocking an arbitrary action abruptly?

## How to review

1. Summarize the proposal in one sentence in terms of the EXPLORE→UNDERSTAND→HEAR→PLAY→COMPOSE
   loop — if it can't be located in that loop, that's itself a flag.
2. Walk each "what to check" item above; mark pass / concern / violation.
3. For any violation, propose the minimal adjustment that keeps the underlying user value but
   restores product identity — don't just reject the idea.

## Output

A short verdict (aligned / needs adjustment / off-identity) plus the specific concerns found, each
tied to a product-spec section. Do not rubber-stamp — silence on a real risk is a failure of this
review.
