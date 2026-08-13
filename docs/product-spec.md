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

**Revised framing (R1, superseding earlier phrasing where narrower):** the harmonic map is not
primarily "a visualization of chords related to this chord" — it is a **navigable map of harmonic
possibilities**, a harmonic path explorer rather than a static harmony graph. The core question it
answers is *"where can this chord go next?"*, then *"and where can I go from there?"*. See §30 for
the completeness rule this implies (all valid next moves stay accessible, never silently
top-N-truncated) and `docs/roadmap.md`'s Phase R3 for the implementation of this navigation model —
Phases 1–4 built the harmonic graph engine and an initial map UI; R3 is the phase that builds the
progressive, path-based navigation experience described here on top of that existing engine.

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
- **Application** at `/app` — interactive use requires an account. Registration itself is free and
  starts a 72-hour full-access trial; no payment card is required to begin (§19). *(Revised R1:
  previously "requires a free account" — reworded since "free" is no longer a commercial tier
  name and that phrasing risked implying a permanent free plan.)*

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

- **Top**: project title, key/free mode (*"free mode" here is a TONAL concept — no locked key —
  unrelated to any commercial plan; see the naming note in §25's revision history), active
  instrument, account/settings.
- **Centre**: harmonic map — a chosen harmonic path plus all next-move options from its current
  endpoint (R3; see §30).
- **Contextual side panel**: selected chord, harmonic info, relationship explanation, instrument
  representation.
- **Bottom**: persistent progression strip, transport/playback, BPM, time signature.

Mobile/tablet get purpose-designed responsive behavior, not a shrunk desktop UI.

## 7. Critical Interaction Rule

*(Revised R3.2 — reintroduces a two-step preview-before-navigation interaction on top of R3.1's
foundations, after real Vercel testing found R3.1's single-click-does-everything model removed the
ability to audition/compare a candidate before committing to it; supersedes R3.1's own
single-click model. §30 and `docs/roadmap.md`'s R3.2 entry have the full navigation-model detail.)*

Three distinct operations, never conflated:

1. Inspecting a chord silently (hover/keyboard-focus on a candidate — informational only, never
   sounds anything, never moves anywhere, never sets preview state).
2. Navigating to a chord — a two-step gesture, not a double-click/timer (persistent UI state;
   arbitrary time may elapse between the two steps):
   - **Preview** (first click/tap/Enter on a candidate): cancels any in-flight audio, plays the
     CONFIRMED path so far plus the candidate — always replayed cumulatively from the beginning —
     and shows layered info in the side panel. Does NOT navigate, recenter, or touch navigation
     history/the progression. Activating a *different* candidate while one is previewed cancels
     the old audition and starts a new one from the confirmed path + the new candidate, still
     without touching confirmed history.
   - **Confirm** (activating the SAME already-previewed candidate again): commits it to navigation
     HISTORY (kept internally for Back and contextual ranking, never rendered as a visible chain
     that could be mistaken for an authored progression), becomes the new current chord, clears
     the preview, recenters the map, and regenerates outgoing options. Plays no audio itself — the
     candidate was already heard in full during preview.
   - Activating the current/center chord replays the confirmed path from the beginning without
     ever navigating or touching history.
   - A local Back control cancels any preview/audio, drops the latest confirmed step, recenters,
     and replays the shortened confirmed path.
3. Adding the chord to the progression.

The exploration/navigation history must never appear as a long visible sequence resembling a
composed progression (the R3.1 correction's original finding, still true under R3.2 — a musician
idly exploring `Em -> C -> Bm -> C -> Em -> D#dim7 -> ...` must not see that read back as if it
were an authored piece). A compact, local "Back" control near the current chord (showing only the
immediately previous chord) is sufficient; the full history does not need permanent screen space.
What must stay true regardless: inspecting a chord must never sound anything or move the map, and
adding to the progression always stays a distinct, explicit action, never triggered by inspecting,
previewing, or confirming.

## 8. Harmonic Map — Harmonic Depth ("Zoom")

Zoom is harmonic depth, not visual scale: it controls which *types of relationships* are shown.
Every edge must have real musical meaning — depth increases never just add random chords. **Depth
is cumulative**: Zoom 2 = Zoom 1 + Zoom 2's own families; Zoom 3 = Zoom 1 + 2 + 3; Zoom 4 = every
family the engine currently models (already the implementation in
`src/domain/graph/harmonicGraph.ts`'s `maxDepth` filter — this is a documentation clarification,
not a behavior change).

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

**Within a depth, every valid modeled relationship stays accessible — ranking may organize
prominence/order/grouping, but must never delete a valid possibility from what the user can reach.**
No arbitrary "top N" recommendation cap at any depth (R3 formalizes and tests this rule; see §30 and
`docs/roadmap.md`'s Phase R3).

**Harmonic Territory (R3.2)** is a separate, independent grouping layered on top of this same
outgoing set — by musical FUNCTION (Natural/Tension/Modal Colour/Substitution/Exploration) rather
than by depth — and drives the map's primary visual identity, with Depth demoted to a small
secondary badge. Territory and Depth never collapse into each other: chords at different depths
routinely share a territory, and chords at the same depth routinely land in different territories.
See §30 for the full territory model.

## 9. Harmonic Depth Availability

*(Revised R1 — this section previously read "Free vs Pro Harmonic Depth" with a permanent Zoom 1–2
vs Zoom 1–4 split. That permanent commercial split no longer exists — see §25's revised business
model.)*

All four Zoom levels are available to any user with active product access — whether that's the
72-hour trial or an active annual license (§25). There is no depth tier gated behind a permanent
"Free" plan; depth of exploration is never gated by a payment tier at all, only by whether the
account currently has active product access. Depth of exploration is never gated per-chord —
gating, where it exists, is at the account-access level (§26's entitlement states), never by
arbitrarily locking individual chords or relationships within an active session.

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

- **Basic catalogue**: ~2–3 useful/basic voicings where available (e.g. open position, common
  movable alternative) — what's surfaced first in the voicing navigator.
- **Extended catalogue**: the larger ranked voicing catalogue.

*(Revised R1: "Free"/"Pro" is no longer the right label for this split — see §25. Any user with
active product access, whether trialing or licensed, can inspect and use the COMPLETE catalogue;
"basic" vs "extended" is a presentation/ranking grouping (what's shown first), not a commercial
gate. The underlying code's `VoicingCatalogue` type still uses `"free" | "pro"` values as of this
revision — see `docs/music-engine.md`'s migration note — pending a future non-behavioral rename.)*

Future: filter by fretboard area, inversion, strings, root position, voicing characteristics.
Never enumerate every mathematically possible fret combination — voicings are ranked by
playability (fret span, hand stretch, finger count, usable strings, chord-tone distribution,
duplicated notes, ergonomics). **The guitar voicing engine must have automated tests.**

## 14. Piano

Keyboard, highlighted notes, fingering where appropriate, root position, inversions, voicings.

- **Basic catalogue**: root position + a small number of useful alternatives.
- **Extended catalogue**: expanded/full inversion and voicing catalogue.

*(Revised R1 — same basic/extended reframing as §13; full catalogue available to any user with
active product access. See §13's note.)*

Future: voice-leading optimisation (not in v1).

## 15. Electric Bass

Never "a guitar tuned lower" — different musical purpose. Primary question: *"how can I navigate
musically over this chord?"*, not *"how do I play the whole chord at once?"*

Show: bass fretboard, root/third/fifth/seventh where applicable, chord-tone positions, TAB, a
useful arpeggio/pattern.

- **Basic catalogue**: chord tones, basic position, one to two useful patterns/arpeggios.
- **Extended catalogue**: additional positions, multiple patterns, alternative arpeggio orders.

*(Revised R1 — same basic/extended reframing as §13; full catalogue available to any user with
active product access. See §13's note.)*

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

Progression transposition is part of core product access (available during the trial and to any
active license — see §25; not a separately-gated feature). Entire progression transposes while
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

## 19. The 72-Hour Trial

*(Revised R1 — replaces the previous permanent "Free Plan" section. There is no permanent free
tier: see §25 for the full commercial model.)*

Every newly registered user gets exactly **72 hours of complete product access**, starting at
registration. No payment card is required to begin. The trial is genuinely the full product, not a
crippled demo — the purpose is "use the real product and decide whether it's valuable enough to
keep," so nothing about the core experience is artificially withheld during those 72 hours.

Trial access includes: account; all four Zoom/harmonic-depth levels; the complete
harmonic-navigation system; all three instruments (Guitar, Bass, Piano); the complete voicing/
position/pattern catalogue for each instrument (not just the "basic" grouping — see §13–15); core
chord info and contextual explanations; harmonic playback and instrument/pattern playback;
progression builder (BPM, time signature, durations, playback, transposition); projects, once
persistence exists (§10A/§10B of `docs/roadmap.md`); PDF exports; Guitar TAB exports; Bass TAB
exports; other approved export formats (§20). Depth of exploration and catalogue completeness are
never rationed during an active trial.

## 20. After the Trial, and Export Policy

When the 72 hours elapse: the account, profile, and all saved projects/musical work remain intact
— **nothing is deleted**. The user can still log in. Full product usage (harmonic navigation
beyond inspection, catalogue access, playback of new material, etc.) and exports become locked,
and the user is invited to activate an annual license (§25). Reactivating an annual license
restores full access immediately, to the same account and the same saved work.

**Exports** (Progression PDF; a useful chord/instrument PDF; Piano representation PDF; Guitar
diagram/TAB PDF; Guitar TAB/text; Bass pattern/TAB PDF; Bass TAB/text; other formats added later)
are part of the real paid product experience — available exactly when an account is `trialing` or
`active` (§26's entitlement states), locked when `expired`. Exact implementation lands in a later
controlled phase (`docs/roadmap.md`'s Phase R4); this section documents policy, not code.

## 21. Assisted Composition (future)

Prefer deterministic musical algorithms over an LLM. Potential functions: path finding
(Cmaj7 → ? → ? → Emaj7), substitution suggestions, voice-leading optimisation, smoother/tenser/more
chromatic alternatives, reharmonisation. *(Revised R1: previously phrased as "Free eventually gets
simple examples; Pro unlocks depth" — that permanent-tier framing is obsolete. Depth here, like
elsewhere, is governed by active product access (trialing/active — §26), not a permanent plan
distinction.)* Prefer limiting harmonic depth/range over artificial "AI credits". No runtime LLM
dependency required for v1.0.

## 22. Project Storage

*(Revised R1 — the previous "Free: max 3 cloud projects. Pro: unlimited" permanent split is
obsolete.)* Requires an account. Project storage access follows the same entitlement states as the
rest of the product (§26): available while `trialing` or `active`; projects and their data are
never deleted on `expired`, but creating/editing may be locked until the account reactivates.
Enforced through the central configurable entitlement system (§26), not scattered checks. (Whether
a numeric project-count cap exists for an active license, if any, is a decision for the phase that
implements enforcement — `docs/roadmap.md`'s Phase 11 — not decided in this revision.)

## 23. Authentication

v1 minimum: email/password, email verification, password reset. Google OAuth desirable if
straightforward. Apple login not required for v1. Onboarding asks **primary instrument**
(Guitar/Bass/Piano) and **main goal** (Explore harmony / Compose / Understand progressions / All
of the above); store these preferences. Registration is also the moment the 72-hour trial (§19)
starts — `trial_started_at` is set server-side at account creation, never client-derived.

## 24. Marketing Consent

Account creation and marketing-email consent are separate; account creation never auto-subscribes
to marketing email. Explicit opt-in checkbox. GDPR/EU-friendly by design.

## 25. Business Model

*(Fully revised R1 — replaces the previous permanent Free/Pro-Annual/Pro-Lifetime three-tier
model. That model, including the Lifetime license, is obsolete and must not be reintroduced without
another deliberate spec revision.)*

```
REGISTER → 72-HOUR FULL TRIAL → ANNUAL PAID LICENSE REQUIRED
```

- **Trial**: 72 hours of complete product access, starting at registration, no payment card
  required (§19).
- **Annual license**: the only ongoing paid product. **Price not yet decided — do not display or
  hard-code a price anywhere until a decision is made and this section is updated with it.** (The
  previous €34.99/year figure was tied to the now-obsolete three-tier model and should not be
  treated as a placeholder or default.)
- **There is no Lifetime license.** There is no permanent free tier. Annual licenses renew yearly;
  behavior on cancellation/non-renewal (grace period, exact `past_due`/`canceled` handling) is a
  decision for the phase that implements billing (`docs/roadmap.md`'s Phase 12), not decided here.

Naming note: the UI concept sometimes called "Free Mode" (§5/§6 — no locked tonal key) is
UNRELATED to this commercial model and predates it; it must not be confused with the removed
commercial "Free" tier. Consider renaming that UI concept later (candidates: "Open Harmony",
"Unlocked Key", "No Fixed Key") if the shared word "free" proves confusing in practice — do not
rename casually without reviewing current i18n/UI implications first.

## 26. Billing and Entitlements

Stripe (Checkout) unless a compelling reason otherwise, for the single Annual license product.
Secure webhook handling, server-side entitlement updates, idempotent webhook processing, billing
status. Never trust client-side payment/trial state — entitlement state is always written
server-side. Never hard-code secrets or Stripe price IDs — environment variables only.

**Central entitlement system** — never scatter `if (user.plan === "pro")` or ad-hoc trial-timer
checks through the app. One module is the single source of truth for account access, minimally
modeling these states:

- `trialing` — within the 72-hour window from `trial_started_at`.
- `active` — a currently-valid annual license.
- `expired` — trial elapsed with no active license, or a license that lapsed.
- Reserved for later billing nuance, not required to implement yet: `past_due`, `canceled`, etc.

That state answers named capability questions — e.g. `canUseApp`, `canSaveProjects`, `canExport` —
never a scattered `user.plan === "..."` string check. See `docs/architecture.md`'s Entitlements
section for the concrete module shape. (Depth/catalogue-specific entitlements like the previous
`canAccessZoom3`/`canAccessFullVoicings` no longer apply — see §9 and §13–15: those are not
gated behind a commercial tier at all anymore, only behind whether the account currently has
active access.)

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

*(Revised R1, then R3.1, then R3.2 — the completeness rule below supersedes the previous "always
emphasise the current chord and its most relevant nearby options" phrasing, which read as license
to silently truncate. R3 implemented the harmonic-path-explorer model on top of the harmonic graph
engine built in Phases 1–4; R3.1 corrected that implementation's own map interaction after the user
tested the deployed R3 preview; R3.2 added Harmonic Territories and reintroduced a
preview-before-navigation interaction after further Vercel testing — see `docs/roadmap.md`'s R3,
R3.1, and R3.2 entries for the full history.)*

The map is a **harmonic path explorer**, not a static neighborhood graph (§0). For the current
chord and harmonic context, the map exposes **every valid immediate outgoing harmonic possibility
the engine currently models, across all depths at once** — ranking, badges, and visual emphasis
organize that set, but never remove a member of it. If 18 unique valid next chords exist, the user
can reach all 18, not a curated top handful.

This is NOT the same as rendering a full recursive tree: the map shows ONLY the current chord plus
ALL immediate next-move options from it — never a candidate's own children. Every visible option
sits on ONE shared ring at the same distance from the current chord, so it reads as a direct
sibling destination, never as a descendant of another option (R3.1: R3's original depth-keyed
concentric rings visually implied false parentage — e.g. a deeper-depth option positioned near a
shallower one on an outer ring looked like it descended FROM that shallower option, rather than
being an equally-direct move from the current chord — this is corrected). Depth is metadata about
the move (a small secondary badge), never expressed as radial position or as a separate graph edge.

**Harmonic Territories (R3.2):** within the one shared ring, options are additionally organized
into labeled sectors by **Harmonic Territory** — a beginner-readable grouping by the musical
FUNCTION of the relationship, independent of Depth: Natural, Tension, Modal Colour, Substitution,
Exploration (Spanish: Natural, Tensión, Color modal, Sustitución, Exploración). Territory is
domain-classified (never hardcoded per chord name), covers the full outgoing set with no overlap
(every option belongs to exactly one territory; empty territories are simply omitted), and drives
the option's primary visual identity (colour, edge style, sector heading) — Depth stays a small,
neutral, secondary badge that never competes with territory colour. A compact, expandable "How to
read the map" legend explains both axes in plain, non-difficulty language (e.g. Depth 1 = very
direct, Depth 4 = more distant/exploratory) using the exact same colour/badge identity as the map
itself, so the two never drift out of sync.

**Interaction (R3.2 — supersedes R3.1's single-click model, see §7 for full detail):** the FIRST
click/tap/Enter on a candidate PREVIEWS it — auditions the confirmed path plus the candidate,
cumulatively from the beginning, and shows layered info in the panel, without navigating or
recentering. The SECOND activation of that SAME candidate CONFIRMS it — commits it as the new
current chord, recenters the map, and regenerates outgoing options; it plays no audio of its own,
since the candidate was already heard during preview. This is persistent UI state, not a
double-click/timer. Hovering/keyboard-focusing an option remains purely silent, informational
preview (never sounds anything, never sets preview state, never moves the map). Activating the
current/center chord replays the confirmed path without navigating. Chosen navigation history is
kept internally (for Back and contextual ranking) but is never rendered as a long visible chain
that could be mistaken for an authored progression — a compact, local Back control near the current
chord is sufficient, and it cancels audio/clears preview/drops the latest step/replays the
shortened path. Previous context (the navigation history so far, or the actual progression when it
corresponds to the current point — see the precedence rule in `docs/roadmap.md`'s Phase R3) may
shift ranking, prominence, and explanation — never membership.

Users can inspect silently, preview (which auditions cumulatively without navigating), confirm
(which navigates), understand, step backward along navigation history, reset to a new starting
chord, and explicitly add to the progression. Relationships must be distinguishable by more than
colour alone.

## 31. Paywall UX

*(Revised R1 — the previous Zoom-tier paywall example is obsolete; there is no permanent Free tier
to "experience fully" before a paywall. See §19/§25.)*

The trial itself IS the natural pre-payment experience: 72 hours of the complete, uncrippled
product (§19), not a feature-limited teaser. The "paywall" moment, when it exists, is the
end-of-trial (or end-of-license) transition — reactivating access, not discovering a locked
feature mid-session. Never abruptly interrupt an in-progress action; when access lapses, communicate
clearly what remains available (login, viewing saved work) versus what requires reactivating a
license (§20), and let the user reactivate without losing anything they built.

## 32. V1.0 Scope

*(Revised R1 — drops the obsolete 3-project Free limit and Annual/Lifetime billing framing; adds
PDF/TAB export, previously deferred, now planned via Phase R4 — see the contradiction note in this
revision's R1 report.)*

In scope: project architecture; authentication; the 72-hour trial; bilingual infrastructure; music
engine; harmonic graph; harmonic map as a progressive path explorer; Zoom 1–4 (available to any
account with active access); central entitlement system (trialing/active/expired); progression
builder; guitar/bass/piano; basic/extended catalogue distinction (not a commercial gate — see
§13–15); browser audio; project storage; Annual license billing; marketing site; responsive UX;
PDF/TAB export system (§20, Phase R4).

Explicitly deferred: sophisticated reharmonisation; automatic advanced voice-leading
optimisation; advanced fingering optimiser; complex route generation; MIDI export; DAW-like
arrangement; collaboration; social/community features; realistic premium sample libraries; native
apps.

## 33. Future Roadmap

Architecture should accommodate (not implement now): advanced harmonic path finding,
voice-leading visualisation/optimisation, advanced substitution tools, harmonic-character
transformations, smarter guitar/piano voicing selection, bass-line connection suggestions, MIDI
export, song sections/repetitions/arrangement, more instruments, more chord families, custom
tunings, teacher functionality, more languages. *(Revised R1: PDF export removed from this
"not yet" list — it moved to explicitly-planned V1 scope via Phase R4, §20/§32. MIDI export
remains future/deferred.)*

## 34. Public Website

Polished, minimal, commercial. Goal: musicians understand the product quickly and register for the
72-hour trial (§19). Hero direction: "See where your chords can go." Supporting line: "Explore
harmony. Hear every path. Play it on your instrument. Build your progression." Primary CTA
copy is a decision for Phase 14 (marketing website, not yet built) to make explicitly — *(Revised
R1: the previous "Start Free" CTA text predates this revision and should be re-evaluated then,
since "Free" is no longer a commercial tier name; e.g. "Start your free trial" more accurately
reflects §19/§25 without implying a permanent free plan. Not decided or implemented here.)*
Visually demonstrate the harmonic map, relationship explanation, instrument representation,
progression builder, and the Explore→Understand→Hear→Play→Compose loop. Show Guitar/Bass/Piano
support. Pricing/trial terms as in §19/§25 (no price to display until §25's price is decided).
Never fabricate testimonials, users, reviews, awards, endorsements.

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
classification, entitlement logic, instrument-note generation, voicing algorithms. Integration/E2E
eventually covers: registration (including trial start), login, project creation,
adding/reordering chords, playback, saving, trial-to-expired transition, license activation
(`expired` → `active`), post-expiry access locking and reactivation. *(Revised R1: previously
"Free project limit, upgrading, Pro access" — reworded for the trial/entitlement-status model;
see §26.)*

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
- **R1 — Product/business-model documentation revision** (this revision — no application behavior
  change)
- **R2 — Instrument audio quality**
- **R3 — Progressive contextual harmonic navigation** (implements §0/§30's path-explorer model on
  the existing harmonic graph engine)
- **R4 — Export system** (implements §20's export policy)
10A. Authentication + 72-hour trial foundation
10B. Project persistence
11. Entitlement enforcement (central `trialing`/`active`/`expired` states — §26)
12. Annual Stripe billing (single Annual license product — no Lifetime, §25)
13. Complete English/Spanish UI
14. Marketing website
15. Responsive UX, accessibility, testing, production polish

*(Revised R1: inserted R1–R4 before authentication per this revision's product refinement; split
the previous single "Phase 10 — Authentication and project persistence" into 10A/10B since they're
now distinct, sequenced pieces of infrastructure; renamed 11/12 to match the revised entitlement
and billing model — no Lifetime license, no permanent Free/Pro split.)*

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
