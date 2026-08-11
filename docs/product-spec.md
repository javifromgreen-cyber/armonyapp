# Armony — Master Product Specification

> Source of truth for product decisions. If implementation reveals a conflict or necessary
> deviation, update this document in the same change that introduces the deviation, and note the
> rationale in `docs/architecture.md` under "Deviations from spec".

## 0. Identity

Armony is an **interactive harmonic exploration environment** for musicians. It is not a chord
generator, not a static chord dictionary, not a Tonnetz visualization, not a music theory course,
not a DAW, and not an AI chatbot.

The core loop, always present together, never split into separate modes:

```
EXPLORE → UNDERSTAND → HEAR → PLAY → COMPOSE
```

Conceptually a "Google Maps for harmony": musicians visually explore harmonic relationships,
understand where a chord can lead, hear those possibilities, see how to play them on their
instrument, and turn discoveries into chord progressions. "Google Maps" is a navigation metaphor
only — the UI must not look like a geographical map.

## 1. Product Philosophy

Three inseparable purposes, delivered through one interaction model (never three modes):

1. Learn and understand harmony.
2. Explore harmonic possibilities.
3. Compose chord progressions.

Serves beginners through advanced musicians without being a beginner-only toy. Principle:
**easy to start, no harmonic ceiling.** The music engine is sophisticated; the UI controls how
much complexity is exposed at any moment.

Interaction rule example: exploring Cmaj7, discovering A7, selecting it lets the user understand
what A7 is, understand its relation to the current context, hear it, see how to play it, explore
from it, and *explicitly* add it to the progression — each a distinct, deliberate action.

## 2. Platform

Web-only, fully responsive. No native iOS/Android/desktop apps. Two layers under one domain:

- **Public website** (marketing): Home, Features, Pricing, FAQ, Login, Register, Privacy, Terms —
  accessible without an account; may show canned demos/screenshots.
- **Application** at `/app` — interactive use requires a free account.

## 3. Languages

Launch: English (default), Spanish. Proper i18n from day one — no hard-coded UI copy in
components; translation files/namespaces; architecture must allow adding languages later without
refactors.

## 4. Visual Direction

Modern, premium, minimal, elegant, dark-first, highly visual, professional, approachable. The
harmonic map is the central visual identity: modern minimal product design + harmonic navigation +
subtle professional music-software conventions. Not childish, not academic, not a dense DAW, not
retro-plugin, not neon-futuristic, not a literal map. Dark mode default; architecture supports
Light mode later. Motion is sparing and purposeful; navigating relationships should feel fluid.

## 5. Fundamental Musical Object

The chord is the fundamental internal musical object. Users can start from a key, a chord, an
existing progression, or a blank canvas — a key is never forced.

- **Locked key mode**: relationships interpreted relative to a tonal centre (e.g. C major).
- **Free mode**: no locked key; the system may suggest possible tonal centres but never imposes
  one.

Architecture should later support modulation inside a progression; do not overbuild this in v1.

## 6. Central Application UX

Harmonic map and chord progression coexist always — never separate "map mode" / "composition
mode". Conceptual desktop layout (may evolve for UX):

- **Top**: project title, key/free mode, active instrument, account/settings.
- **Centre**: harmonic map.
- **Contextual side panel**: selected chord, harmonic info, relationship explanation, instrument
  representation.
- **Bottom**: persistent progression strip, transport/playback, BPM, time signature.

Mobile/tablet get purpose-designed responsive behavior, not a shrunk desktop UI.

## 7. Critical Interaction Rule

Three distinct operations, never conflated:

1. Selecting a chord (inspect it).
2. Exploring/recentring the map around a chord.
3. Adding the chord to the progression.

Selecting a chord must never silently modify the progression.

## 8. Harmonic Map — Harmonic Depth ("Zoom")

Zoom is harmonic depth, not visual scale: it controls which *types of relationships* are shown.
Every edge must have real musical meaning — depth increases never just add random chords.

- **Zoom 1 — Immediate harmonic environment**: diatonic chords of the current context; basic
  tonic/predominant/dominant relationships; common scale-degree movements; relative major/minor;
  immediately useful nearby choices.
- **Zoom 2 — Expanded common harmony**: simple secondary dominants; common borrowed chords; common
  sevenths/extensions from the chord catalogue; basic substitutions; frequent accessible chromatic
  relationships.
- **Zoom 3 — Advanced harmony**: broader modal interchange; chains of secondary dominants; tritone
  substitution; passing diminished relationships; chromatic mediants; nearby modulation
  relationships; sophisticated chromatic movement.
- **Zoom 4 — Deep harmonic exploration**: remote harmonic relationships; distant tonal
  connections; chromatic chains; common-tone relationships; non-functional harmonic pathways; deep
  graph exploration.

## 9. Free vs Pro Harmonic Depth

- **Free**: Zoom 1, Zoom 2.
- **Pro**: Zoom 1–4.

Depth of exploration is gated, never individual chords arbitrarily locked.

## 10. Initial Chord Catalogue (v1.0)

major, minor, diminished, augmented, sus2, sus4, maj7, dominant 7, minor 7, minor 7 flat 5,
diminished 7, add9, 6, minor 6, 9, minor 9, maj9.

Architecture allows later: 11, 13, altered dominants, advanced slash chords, further extended
structures — not implemented prematurely.

## 11. Chord Information

**Musical information**: chord name, notes, interval formula (e.g. Am7 → A C E G → 1 b3 5 b7).

**Context information** (when a harmonic context exists): scale degree, harmonic function,
relationship to source/current chord, possible resolution tendencies, a concise
musician-friendly explanation — never a long theory lesson.

## 12. Instruments (v1.0)

Guitar, Electric Bass, Piano/Keyboard. Exactly one active at a time, instantly switchable.
Switching instrument changes only the instrumental representation — never the harmonic context,
map, or progression.

## 13. Guitar

Fretboard/chord diagram, fretted notes, finger numbers where appropriate, TAB, chord tones,
multiple playable voicings — a chord never has one single shape.

- **Free**: ~2–3 useful/basic voicings where available (e.g. open position, common movable
  alternative).
- **Pro**: larger useful voicing catalogue.

Future: filter by fretboard area, inversion, strings, root position, voicing characteristics.
Never enumerate every mathematically possible fret combination — voicings are ranked by
playability (fret span, hand stretch, finger count, usable strings, chord-tone distribution,
duplicated notes, ergonomics). **The guitar voicing engine must have automated tests.**

## 14. Piano

Keyboard, highlighted notes, fingering where appropriate, root position, inversions, voicings.

- **Free**: root position + a small number of useful alternatives.
- **Pro**: expanded/full inversion and voicing catalogue.

Future: voice-leading optimisation (not in v1).

## 15. Electric Bass

Never "a guitar tuned lower" — different musical purpose. Primary question: *"how can I navigate
musically over this chord?"*, not *"how do I play the whole chord at once?"*

Show: bass fretboard, root/third/fifth/seventh where applicable, chord-tone positions, TAB, a
useful arpeggio/pattern.

- **Free**: chord tones, basic position, one useful pattern/arpeggio.
- **Pro**: additional positions, multiple patterns, alternative arpeggio orders.

Future: root-only mode, chord-tone mode, voice leading, chord-to-chord bass-line suggestions,
double stops/chordal bass.

Core rule — **Guitar/Piano**: how can I execute this chord? **Bass**: how can I navigate through
this chord?

## 16. Progression Builder

Not a DAW — a lightweight, musically useful builder. Each progression chord: chord, duration in
beats, order/index. Project has BPM and time signature.

Users can: add/remove/reorder chords, change durations, change BPM/time signature, play the
progression, transpose it.

Future architecture: sections, repetitions, verse/chorus, arrangement blocks, mini-sequencer
behavior — not built yet.

## 17. Transposition

Basic progression transposition is a **Free** feature. Entire progression transposes while
preserving harmonic relationships; instrument views update accordingly.

## 18. Audio

Two playback concepts:

- **Neutral harmonic playback**: neutral piano/synth-like sound for understanding harmonic
  content ("Hear chord").
- **Instrument/voicing playback**: reproduces the exact displayed representation ("Hear this
  voicing") — guitar plays the selected voicing, piano the selected voicing, bass the selected
  arpeggio/pattern.

Web Audio API and/or Tone.js. Simple synthesis / lightweight legally-usable sounds are enough for
v1 — correctness of pitch, timing, voicing, and responsiveness matter more than realism. Avoid
expensive external audio services.

## 19. Free Plan

Genuinely useful, not a crippled demo. Full core loop (Explore/Understand/Hear/Play/Compose).
Includes: account; Zoom 1–2; guitar/bass/piano; core chord info; contextual explanations; basic
instrument representations; ~2–3 basic voicings where appropriate; harmonic playback;
instrument/voicing playback; progression builder; BPM/time signature/durations; progression
playback; transposition; max 3 cloud projects; copy progression as text; export basic progression
image; limited basic examples of future assisted-harmony features once built.

## 20. Pro

Everything in Free, plus: Zoom 3–4; deeper harmonic exploration; expanded/full voicing
catalogues; advanced instrument positions; unlimited cloud projects. Future Pro-only: advanced
path finding, voice-leading optimisation, fingering optimisation, advanced substitutions,
progression-character transformations, modulation detection, reharmonisation, MIDI export, PDF
export, advanced diagram/progression exports. Not all v1.0 requirements — architecture must
support them. Never advertise unfinished functionality on the pricing page.

## 21. Assisted Composition (future)

Prefer deterministic musical algorithms over an LLM. Potential functions: path finding
(Cmaj7 → ? → ? → Emaj7), substitution suggestions, voice-leading optimisation, smoother/tenser/more
chromatic alternatives, reharmonisation. Free eventually gets simple examples; Pro unlocks depth.
Prefer limiting harmonic depth/range over artificial "AI credits". No runtime LLM dependency
required for v1.0.

## 22. Project Storage

Requires an account. Free: max 3 cloud projects. Pro: unlimited. Enforced through a central
configurable entitlement system.

## 23. Authentication

v1 minimum: email/password, email verification, password reset. Google OAuth desirable if
straightforward. Apple login not required for v1. Onboarding asks **primary instrument**
(Guitar/Bass/Piano) and **main goal** (Explore harmony / Compose / Understand progressions / All
of the above); store these preferences.

## 24. Marketing Consent

Account creation and marketing-email consent are separate; account creation never auto-subscribes
to marketing email. Explicit opt-in checkbox. GDPR/EU-friendly by design.

## 25. Business Model

- **Free** — €0
- **Pro Annual** — €34.99/year
- **Pro Lifetime** — €79.99 one-time

No launch discount. Annual and Lifetime unlock identical Pro functionality. Lifetime never
expires. Annual stays active until the end of the paid billing period after cancellation.

## 26. Billing

Stripe (Checkout) unless a compelling reason otherwise. Support annual subscription, Lifetime
one-time payment, secure webhook handling, server-side entitlement updates, idempotent webhook
processing, billing status. Never trust client-side payment state. Never hard-code secrets or
Stripe price IDs — environment variables only.

Central entitlement/feature system — never scatter `if (user.plan === "pro")` through the app.
Prefer named entitlements: `canAccessZoom3`, `canAccessZoom4`, `maxCloudProjects`,
`canAccessFullVoicings`, `canExportMidi`, `canExportPdf`, etc.

## 27. Technical Principles

Priorities in order: maintainability, reliability, simplicity, performance, low ongoing
infrastructure cost. Avoid unnecessary microservices, paid APIs, runtime LLM dependencies,
architectural complexity. Prefer client-side music computation and audio where appropriate. See
`docs/architecture.md` for the concrete stack decision.

## 28. Music Theory Engine

Completely separated from presentation. Never bury harmonic rules inside React components.
Reusable domain modules: notes, pitch classes, enharmonic spelling, intervals, chord formulas,
chord construction/parsing, keys, scales, scale degrees, harmonic functions, harmonic
relationships, substitutions, transposition, harmonic graph generation, instrument
representations, voicing generation/ranking. Strong automated tests are mandatory (see
`docs/music-engine.md`). Respect contextual spelling — never reduce everything to sharps only.

## 29. Harmonic Graph

Harmonic exploration modeled as a graph. Node = chord in harmonic context. Edge = meaningful
harmonic relationship with metadata: source, target, relationship type, harmonic depth,
relevance/strength, explanation key, harmonic context. Relationship types include: diatonic,
dominant, predominant, relative, secondary dominant, borrowed, modal interchange, tritone
substitution, diminished passing, chromatic mediant, common-tone, modulation-related. Generated
from explicit musical rules, not hand-authored per node. Correctness over cleverness.

## 30. Map UX

Never dump the entire harmonic universe on screen. Always emphasise the current chord and its most
relevant nearby options. Users can select, inspect, hear, understand, recenter, and explicitly add
to the progression. More relationship categories appear as depth increases. Relationships must be
distinguishable by more than colour alone.

## 31. Paywall UX

Paywalls feel natural, never abrupt. Bad: click an arbitrary chord → paywall. Good: experience
Zoom 1–2 fully, then encounter "Zoom 3 — Advanced harmonic relationships — Pro" or "7 additional
voicings available with Pro". Free must deliver the product's aha moment before any payment ask.

## 32. V1.0 Scope

In scope: project architecture; authentication; bilingual infrastructure; music engine; harmonic
graph; harmonic map; Zoom 1–4; entitlement system; progression builder; guitar/bass/piano;
basic/full voicing distinction; browser audio; project storage; 3-project Free limit;
Annual/Lifetime billing; marketing site; responsive UX; basic text/image export.

Explicitly deferred: sophisticated reharmonisation; automatic advanced voice-leading
optimisation; advanced fingering optimiser; complex route generation; MIDI export; PDF export;
DAW-like arrangement; collaboration; social/community features; realistic premium sample
libraries; native apps.

## 33. Future Roadmap

Architecture should accommodate (not implement now): advanced harmonic path finding,
voice-leading visualisation/optimisation, advanced substitution tools, harmonic-character
transformations, smarter guitar/piano voicing selection, bass-line connection suggestions, MIDI
export, PDF export, song sections/repetitions/arrangement, more instruments, more chord families,
custom tunings, teacher functionality, more languages.

## 34. Public Website

Polished, minimal, commercial. Goal: musicians understand the product quickly and create a free
account. Hero direction: "See where your chords can go." Supporting line: "Explore harmony. Hear
every path. Play it on your instrument. Build your progression." Primary CTA: "Start Free."
Visually demonstrate the harmonic map, relationship explanation, instrument representation,
progression builder, and the Explore→Understand→Hear→Play→Compose loop. Show Guitar/Bass/Piano
support. Pricing as in §25. Never fabricate testimonials, users, reviews, awards, endorsements.

## 35. Accessibility

Keyboard accessibility where practical; semantic buttons; visible focus states; appropriate
contrast; ARIA where needed; non-colour alternatives for information; reduced-motion awareness;
responsive typography.

## 36. Performance

The harmonic graph can grow large — never render it all. Prefer local/progressive graph
expansion. Optimise node count, rendering, React updates, audio scheduling, loading. Initial
interaction must feel fast.

## 37. Privacy and Data

Collect only necessary data. Account: email, display name if needed, primary instrument, main
goal, language, marketing consent, entitlement state. Projects: name, harmonic context/mode,
progression, BPM, time signature, instrument/preferences, timestamps. Payment-sensitive data
stays with Stripe.

## 38. Code Quality

Real commercial product, not a prototype. Strict TypeScript; clear architecture; reusable domain
logic; sensible components; input validation; error handling; loading/empty states; automated
tests; no secrets in source control; `.env.example`; README; database migrations; seed data where
useful. Avoid giant components and a single giant `musicTheory.ts` — split music domains
intelligently.

## 39. Testing

Musical correctness is mission-critical. Strong automated coverage: chord generation/parsing,
intervals, scale/key generation, enharmonic spelling, transposition, harmonic relationships, Zoom
classification, entitlement logic, project limitations, instrument-note generation, voicing
algorithms. Integration/E2E eventually covers: registration, login, project creation,
adding/reordering chords, playback, saving, Free project limit, upgrading, Pro access.

## 40. Implementation Strategy

Work in controlled phases, verifying at the end of each:

1. Architecture and core infrastructure
2. Music theory engine + tests
3. Harmonic graph engine + Zoom 1–4 + tests
4. Core harmonic map UI
5. Progression builder
6. Audio
7. Piano representation
8. Guitar representation and voicing engine
9. Bass representation
10. Authentication and project persistence
11. Free/Pro entitlement system
12. Stripe Annual + Lifetime
13. Complete English/Spanish UI
14. Marketing website
15. Responsive UX, accessibility, testing, production polish

Sequence may adjust for compelling technical dependencies (see `docs/roadmap.md` for current
status and any adjustments).

## 41. Development Rules

At the end of every significant phase: run tests, type-check, lint, build, fix errors, verify no
regressions, document important architectural decisions. Never build on known-broken foundations.
When uncertain about music theory: don't guess — prefer explicit rules, tests, and documented
assumptions. When uncertain about minor implementation details: choose the simplest solution
compatible with this spec, without stopping for trivial questions.

## 42. Claude Code Project Configuration

`CLAUDE.md` holds persistent architectural/product rules only (not a spec duplicate). Project
skills live in `.claude/skills/`: `music-theory-review`, `product-scope-review`, `release-check`.

## 43. Documentation as Source of Truth

This file is the persistent source of truth for product scope. `docs/architecture.md`,
`docs/roadmap.md`, and `docs/music-engine.md` hold the technical elaboration. Implementation
decisions that modify product scope must update this document in the same change.

## 44–45. Guiding Reminder

Armony is an **interactive harmonic exploration environment**: musicians SEE where harmony can go,
UNDERSTAND why, HEAR the result, PLAY it on their instrument, and BUILD it into music. It is not a
note-naming website, not a progression generator, not a static Tonnetz, not a theory course, not a
DAW, not a harmony chatbot. Protect this identity throughout design and implementation.
