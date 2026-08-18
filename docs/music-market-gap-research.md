# Music-Industry Market-Gap Research — New SaaS Opportunity

**Date:** 2026-08-17
**Method:** Pain-first market research across 18 musician/music-professional segments, using live web research (Reddit, forums, app-store/review aggregators, competitor pricing pages, industry blogs). Conducted via four parallel research passes (bands/touring, teachers/schools/session musicians/rehearsal studios, producers/composers/songwriters, venues/solo performers/live crews/content creators), then synthesized and scored here.

**Read this before the findings:** the research environment's `WebFetch` tool was blocked for almost every external domain this session (Reddit, Capterra, G2, Trustpilot, PissedConsumer, Gearspace, vendor pricing pages, even Wikipedia). Every finding below comes from `WebSearch`'s synthesized results, not a first-hand page read — search results in this environment did often surface direct quotes and links, but pricing figures in particular should be treated as **directionally correct, not vendor-confirmed**, and reddit-native sourcing is thinner than the brief asked for. This is flagged inline wherever it materially affects confidence, and it is the single biggest reason to run a human validation pass (Section 12) before writing any code.

---

## 1. Executive conclusion

The strongest, most repeatedly-evidenced pain in this entire research set is **not** a musical-creativity problem — it's that gig-based musicians (session players, solo performers, freelance teachers) cannot answer "what did I earn, and who still owes me?" without opening three apps and a calculator. This shows up independently, unprompted, in three of the four research passes, with first-hand blogged testimony and an explicit statement that "there are not any solutions tailored specifically to freelance musicians." It is also the easiest opportunity on this entire list to build — forms, PDFs, email reminders, a dashboard — with no ML, no DSP, no fragile third-party dependency.

A second, adjacent cluster is real but smaller: **band-level money mechanics** (splitting tonight's payout, wedding-band contracts/deposits, chasing venues for payment) and **live-logistics paperwork** (stage plots, finding a same-week substitute player). These are boring, unglamorous, and exactly the kind of problem this brief asked to prioritize over "interesting music technology."

Several loud, well-evidenced pains turned out to be **bad product bets anyway**: distributor payment delays/account suspensions (Vydia, ONErpm, Amuse, CD Baby) cause real five-figure financial harm, but fixing it would require becoming a trusted financial intermediary sitting between artists and DSPs — not a buildable MVP, closer to a fintech/escrow business with real regulatory exposure. YouTube Content ID falsely claiming original compositions is real and painful but the only fix routes through YouTube's own dispute machinery — a platform-dependency trap, not a product gap. Split-sheet documentation is real but already has five-plus funded competitors fighting over it (SPLITS, SplitChord, SongSplits, Auddly/Session, CoWriter IO) — a crowded market, not a gap.

Several segments named in the brief turned out to have **no attractive standalone opportunity**: live sound/technical crews (thinnest evidence of any segment — plausible pain, no first-hand confirmation), content creators who are musicians (evidence collapses into generic "YouTuber tools" or platform-dependency traps), and touring-tour-management (real gap between spreadsheets and $99–250/month enterprise tools, but evidence is inference-grade, not first-hand).

**Bottom line recommendation:** build a narrow, boring, gig-income tracking and invoicing tool for freelance/session musicians and solo performers first (Section 7, Opportunity #1). It has the best evidence, the best buildability, the clearest willingness-to-pay signal, and the thinnest real competition of anything found. Everything else in this report is secondary and should wait for validation.

---

## 2. Market landscape

Music-adjacent SaaS breaks into three tiers that behave very differently commercially:

- **Mature, contested categories** — music teacher/studio management (My Music Staff, Fons, Duet Partner, Teachworks, Opus1), music distribution (DistroKid, TuneCore, CD Baby, Amuse, ONErpm), and split-sheet apps. All have multiple funded, reasonably competent incumbents. New entrants here need a sharp wedge, not a general "better version."
- **Thin, underserved micro-niches** — gig-income tracking for freelancers, gig-payout splitting, stage-plot tooling, deputy/substitute-musician coordination, rehearsal-studio-specific booking. These have real complaint density but only small, low-visibility, or stagnant competitors (if any). This is where the opportunity is.
- **Structurally unfixable-by-SaaS pains** — distributor payment failures, YouTube Content ID, streaming metadata misattribution, platform shutdowns (Songkick, Sonicbids). These are real and painful, but the "fix" is controlled by a large third party (a DSP, YouTube, a distributor) the startup has no leverage over. Building here means building a workaround, not a solution, and typically fails the "could a credible MVP be built by one developer" test.

Across every segment researched, one pattern repeats: **paying customers of existing SaaS still maintain a spreadsheet on the side.** Teachers who pay for My Music Staff still buy Etsy repertoire-tracking templates. Session musicians build their own Notion boards to track 160 gigs a year. Studio owners who pay for booking software still keep an Excel profitability model. This is the clearest signal in the whole research set that current tools solve the *transactional* layer (calendar, invoice) but not the *judgment* layer (what am I actually earning, what's my repertoire coverage, who owes me) — and it recurs regardless of price point or maturity of the incumbent.

---

## 3. 30+ recurring problems discovered

Grouped by theme. Evidence grade: **Strong** (first-hand quotes/data, multiple independent sources), **Moderate** (real but single-source or partly inferred), **Weak/Speculative** (vendor-blog only, or plausible but unconfirmed — explicitly flagged, not discarded, per the brief's instruction to distinguish evidence from speculation).

### Money: earning, paying, splitting
1. **Freelance/session musician income & payment tracking** ("what did I earn, who owes me") — *Strong.* Independent LA session violist: *"Most freelance musicians can't tell you what they earned last [year] without opening at least 3 apps, grabbing a calculator, and chugging a cup of coffee"* and *"there are not any solutions tailored specifically to freelance musicians"* ([thatviolakid.substack.com](https://thatviolakid.substack.com/p/youre-not-disorganized-your-systems)). Corroborated independently by a producer/session-musician blog (michaelmusco.com) and by a live cottage industry of paid Gumroad/Airtable gig-income spreadsheet templates.
2. **Gig-payout splitting among band members** — *Strong.* Recurring forum disputes over uneven splits (equipment owners wanting extra share, etc.) — Harmony Central, Drum Forum, Music Player Network threads, 2009–present. At least one company (Band Pencil) built a free "gig settlement calculator" purely as a lead magnet — evidence someone thought this math problem alone was worth productizing.
3. **Chasing late/delayed payment from venues and private clients** — *Strong.* TalkBass thread on multi-week AP delays; UK Musicians' Union recovered over £250,000 in unpaid member fees in one year; wedding planner (Threads, @swoonsoiree) describes day-of-payment as a recurring red flag she watches for.
4. **Chasing late payments from students' parents** (teachers) — *Strong evidence of the pain, weak evidence of a gap* — Piano World forum threads document $630+ owed for months; but purpose-built teacher-billing tools (Fons, My Music Staff) already automate recurring billing and reviewers confirm it works ("never missed receiving a payment because Fons retrieves it"). This looks like a problem the market has already substantially solved for adopters.
5. **Distributor payment delays / account suspensions / withheld royalties** — *Very strong, but not a buildable product* — Vydia federal lawsuit (Case 1:23-cv-07568, filed Aug 2023) describing payment delays "3 months to indefinite," balances $200–$20,000+ affected; ONErpm 2.5★/39 reviews with catalog deletions/earnings freezes in 18 documented cases; Amuse account deactivations; CD Baby delivery delays "3+ months" and support waits "up to 6 months." Systemic across the whole budget/mid-tier distributor market — but the fix requires becoming a financial intermediary between artists and DSPs.
6. **Unclaimed/unmatched mechanical royalties (US MLC)** — *Moderate* — "$500 million in unmatched mechanical royalties" sitting at the MLC, independent artists reportedly miss ~$800/yr if unregistered (chartlex.com). Root cause is an awareness/literacy gap, not a technical one; registration itself is free, capping willingness-to-pay.
7. **Publishing-administrator payment delays/opacity** (Songtrust) — *Strong but structural* — PissedConsumer: songs submitted 2018, unpaid as of 2025; Songtrust itself acknowledged "slower registration timelines" in 2023 (Billboard). This is evidence against the market leader, not evidence of an open gap a small competitor could easily win.

### Contracts, deposits, legal paperwork
8. **Wedding/function-band contracts & deposit/cancellation management** — *Moderate* — Legal GPS: *"Many bands struggle with late payments, last-minute cancellations, or unclear payment terms because they don't have a solid contract in place."* Evidence is mostly the proliferation of generic legal templates (not music-specific), implying bands cobble together protection from adjacent industries.
9. **Songwriting split-sheet disputes** — *Strong pain, saturated market* — Real disputes cited (Lola Young/Carter Lang, Lizzo "Truth Hurts" countersuit); mechanism well documented (avoiding the % conversation "kills the excitement" in-session). But 5+ funded competitors already exist (SPLITS, SplitChord, SongSplits, Auddly/Session, CoWriter IO).
10. **PRO registration confusion** (mismatched writer/publisher affiliation) — *Moderate* — direct forum quote (MusicLibraryReport) describing a writer forfeiting 50% of performance royalties from a PRO/publisher mismatch. Small, literacy-gap problem.
11. **Beat-licensing/production contracts done informally** — *Weak* — inferred mainly from volume of downloadable beat-lease templates (LawInsider, Gumroad) rather than first-hand "I got burned" testimony at scale; one Trustpilot cluster (beatrising.com) describes real non-payment disputes.
12. **Repeated certificate-of-insurance (COI) collection** between venues and touring acts — *Weak/inference* — an insurer explicitly markets free COI reissuance as a feature (K&K Insurance), implying repeated friction, but no first-hand musician/venue complaint was found.

### Live logistics: stage plots, riders, advancing, substitutes
13. **Stage plot / input list tools are dated, paywalled, fragmented** — *Strong* — StagePlot Guru: "must buy the pro version to get more than 4 props," "cluttered," "missing modern gear icons like RF or pedalboards," with "ongoing issues that have persisted for 6 years" (apptail.io, saashub.com). At least 6 competing standalone apps exist, none dominant.
14. **Hospitality riders routinely ignored by venues** — *Weak* — single vendor-blog source (stagebuilderpro.com), no first-hand musician quote found.
15. **Venue advancing = fragmented WhatsApp/email/phone chaos** — *Weak* — single vendor-blog source (stageportal.gg) citing "40 emails per show advance," self-serving (written by a company selling the fix), no independent corroboration found.
16. **Finding/briefing last-minute deputy/substitute musicians** ("dep culture") — *Strong* — For Funk Sake (UK wedding-band blog) documents deps being poached by higher offers and the risk of an all-substitute "scratch band"; a Facebook group with 47,000+ members exists specifically for last-minute dep-finding, with multiple posts per day. An entire informal, unvetted economy exists because no dedicated tool owns this workflow.
17. **Equipment inventory & insurance documentation for touring** — *Speculative* — several unrelated insurance/finance blogs stress that "without documentation, claims get denied," but no first-hand musician complaint (denied claim, hated workflow) was found.

### Scheduling & coordination
18. **Rehearsal scheduling coordination for bands** — *Speculative* — no first-hand complaint thread found; only indirect evidence (a few small niche apps — BandZone, Band Mule, RockbandRoadie — exist targeting this).
19. **Multi-teacher studio room/schedule coordination breaks down past ~3–5 teachers** — *Moderate/inference* — consultant-blog sourcing (Jumbula, Villa Group), reinforced by the existence of dedicated "multi-teacher" product tiers (My Music Staff), but no first-hand studio-owner quote.
20. **Rehearsal-studio (business) no-shows/late cancellations cost revenue directly** — *Strong* — multiple studio cancellation policies found in the wild (Fort Knox Studios: 100% fee under 24hr notice; Labyrinth Studios keeps deposit as cancellation fee); Gearspace thread from a 24-year studio veteran describing standard 50%-deposit practice.
21. **Generic space-booking tools (Skedda, SimplyBook.me) mismatch how rehearsal studios actually book** — *Strong* — a Jammed reviewer: *"a severe lack of online bookings that are suitable for the way a rehearsal space works."* Real but thin niche — one purpose-built, well-reviewed competitor (Jammed) already largely occupies it.
22. **Generic scheduling tools (Calendly/Acuity) mismatch lesson-package/session-based billing** — *Moderate* — comparison-blog sourcing explains structurally why teachers outgrow these tools; consistent with (but not proof of) the existence of purpose-built teacher-billing competitors.

### Repertoire, setlists, teaching/creative admin
23. **Setlist-app collaboration/reliability failures** — *Strong* — sharing a setlist band-wide in OnSong reportedly "requires 9 complex steps and Dropbox" (forum.fractalaudio.com); BandHelper reviewers call it "too complicated." Market is fragmented across a dozen near-identical apps with no clear winner.
24. **Repertoire/progress tracking done by hand by teachers** — *Strong* — a real cottage industry of paid Etsy/Gumroad spreadsheet templates for exactly this, used even by teachers who already pay for studio-management software — the clearest "even paying customers still use a spreadsheet" signal in the whole dataset.
25. **Practice-tracking app unreliability** (Tonara) — *Strong, but risky to build around* — documented reliability complaints (battery drain, mis-logged practice time) severe enough to trigger a publicly documented mass teacher migration to a competitor (two dedicated podcast episodes on the exodus). Excluded from the final 10 because a competitive replacement risks scope-creep into pitch/timing detection (DSP), which this brief explicitly asked to avoid.
26. **Session/collaborator credit tracking across many songs/projects** — *Moderate* — real but thin evidence; addressed today only by generic CRM templates repurposed for music.
27. **Tracking where a composer's music has actually been placed/used** — *Moderate* — spreadsheet is the explicitly recommended default tool (That Pitch); a couple of small dedicated tools exist (Trqk, Composer Catalog), no dominant player.

### Trust, platforms, and structural traps
28. **Trust/fee/vetting problems on gig marketplaces** (GigSalad, GigMasters) — *Strong pain, bad opportunity* — GigSalad 2.3★/30 reviews ("no screening... no backup plan for no-shows"); GigMasters "fake leads, unvetted vendors," 15% commission. Entrenched duopoly despite bad reviews — a new entrant faces a hard two-sided-marketplace liquidity problem against incumbents with existing supply.
29. **Booking/marketing platform mortality risk** — *Moderate, not really a product* — Songkick fully shut down Oct 31 2023 after Ticketmaster/Live Nation legal pressure; Sonicbids "rebuilding from the ground up" after acquisition. Real risk, but "platforms sometimes die" isn't itself a product to build.
30. **Metadata/credit errors on streaming platforms** (wrong songwriter/producer attributed) — *Strong, structurally unfixable by a 3rd party* — years-long open threads on Spotify's own community forum; the only fix path runs back through the artist's distributor/label.
31. **YouTube Content ID falsely claims original compositions** — *Strong, platform-dependency trap* — VI-Control forum thread; Grammy winner Maria Schneider's class-action lawsuit against YouTube over Content ID abuse. Real, but the only remedy is YouTube's own dispute process — nothing a third-party SaaS can directly fix.
32. **ISRC continuity loss when switching distributors** — *Moderate* — multiple ISRC explainer articles converge on the same trap (new distributor issues fresh ISRCs, wiping stream history/playlist placements) — sharp and quantifiable, but a rare, per-switch event rather than a recurring pain.

### Client-facing production work
33. **Mix/master client revision approval & payment collection chaos** — *Strong* — the existence of HitSend (consolidating file-share, timecoded feedback, and Stripe/PayPal invoicing at $35–40/mo) is itself evidence the email+WeTransfer+ad-hoc-invoice default is broken enough to sustain a niche SaaS; one reviewer explicitly: "the price is way too high... great concept though."
34. **Cue sheet mismanagement for film/TV composers** — *Strong pain, weak leverage* — dedicated MusicLibraryReport forum documents cue sheets "disappearing," productions filing a year late or never; composers are advised to file their own cue sheet as insurance, but have almost no control over whether the production company files correctly.

### Weaker / discarded items (included for completeness, not recommended)
35. **Band internal comms losing context in WhatsApp** — *Weak*, vendor-blog only; generic tools (Discord/Notion) are already "good enough" for most.
36. **Voice-memo/idea-capture chaos for songwriters** — *Moderate*, but a fragmented market of 4+ near-identical small apps (Dubnote, Musebox, Spit Notes, SOAPP) with no clear winner and modest willingness-to-pay.
37. **Small-venue talent-buying software gap for very small venues** — *Inference only* — existing tools (Prism.fm, Talent Buying Pro) appear positioned at professional/mid-size venues; no first-hand very-small-venue complaint found.

---

## 4. Pain/opportunity scoring table

Scale 1–10 per column. **CurSolQ** = current solution quality, where **10 means current solutions are terrible** (a positive signal for opportunity). **Competition** = 10 means highly saturated (a **negative** signal, subtracted). Opportunity Score = average(Frequency, Pain, Money, CurSolQ, WillingnessToPay, Buildability) − Competition⁄3, rounded to 1 decimal. This is a rough triage aid, not a precise forecast — several rows are flagged where the raw score overstates real-world viability (noted in the far-right column).

| # | Problem | Freq | Pain | Money | CurSolQ | WTP | Build | Comp | **Score** | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Freelance/session musician income & payment tracking | 8 | 8 | 9 | 9 | 7 | 9 | 2 | **7.7** | Best overall |
| 2 | Gig-payout splitting among band members | 7 | 6 | 8 | 8 | 5 | 10 | 3 | **6.3** | Trivial to build |
| 5 | Distributor payment delays/suspensions | 3 | 10 | 10 | 9 | 6 | 2* | 2 | 6.0* | *Not a buildable MVP — fintech/escrow territory, excluded |
| 3 | Chasing late payment from venues/clients | 6 | 7 | 8 | 7 | 6 | 8 | 4 | **5.7** | |
| 16 | Deputy/substitute musician coordination | 6 | 6 | 7 | 8 | 5 | 5 | 2 | **5.5** | 2-sided marketplace risk |
| 24 | Repertoire/progress tracking (teachers) | 7 | 5 | 4 | 8 | 6 | 9 | 4 | **5.2** | |
| 8 | Wedding/function-band contracts & deposits | 5 | 6 | 8 | 7 | 6 | 8 | 5 | **5.0** | |
| 20 | Rehearsal-studio no-shows/cancellations | 7 | 6 | 8 | 5 | 5 | 7 | 5 | **4.7** | |
| 13 | Stage plot/input-list tools dated & fragmented | 4 | 6 | 5 | 8 | 5 | 9 | 5 | **4.5** | |
| 33 | Mix/master client approval & invoicing | 6 | 6 | 7 | 6 | 6 | 7 | 6 | **4.3** | HitSend already competent |
| 19 | Multi-teacher studio scheduling coordination | 6 | 6 | 6 | 6 | 6 | 7 | 6 | **4.2** | |
| 34 | Cue sheet mismanagement (composers) | 3 | 6 | 6 | 7 | 4 | 5 | 3 | **4.2** | Small TAM |
| 6 | Unclaimed MLC royalties | 2 | 5 | 7 | 7 | 3 | 6 | 3 | **4.0** | Low recurring WTP |
| 31 | YouTube Content ID false claims | 3 | 7 | 6 | 7 | 4 | 3 | 3 | **4.0** | Platform-dependency trap |
| 30 | ISRC continuity loss on distributor switch | 1 | 6 | 6 | 7 | 2 | 6 | 2 | **4.0** | Too rare per user |
| 37 | Small-venue booking/talent-buying gap | 4 | 5 | 6 | 6 | 5 | 6 | 4 | **4.0** | Inference-only |
| 25 | Teacher payroll/commission-split tracking | 4 | 5 | 6 | 6 | 6 | 7 | 6 | **3.7** | |
| 15 | Venue advancing chaos | 4 | 5 | 4 | 6 | 3 | 6 | 3 | **3.7** | Vendor-blog only |
| 17 | Equipment/insurance docs (touring) | 2 | 4 | 5 | 6 | 3 | 7 | 2 | **3.8** | Speculative |
| 27 | Composer placement/royalty tracking | 3 | 5 | 6 | 6 | 4 | 7 | 4 | **3.8** | Small TAM |
| 10 | PRO registration confusion | 2 | 5 | 6 | 7 | 3 | 6 | 3 | **3.8** | Literacy gap, low WTP |
| 4 | Chasing late payment from parents (teachers) | 6 | 6 | 6 | 4 | 5 | 8 | 8 | **3.2** | Already well-served |
| 9 | Split-sheet disputes | 3 | 7 | 8 | 6 | 5 | 8 | 9 | **3.2** | Saturated (5+ competitors) |
| 25b | Session/collaborator credit tracking | 4 | 4 | 4 | 6 | 3 | 7 | 4 | **3.3** | |
| 23 | Setlist-app collaboration failures | 6 | 6 | 3 | 7 | 4 | 8 | 7 | **3.3** | Very crowded (12+ apps) |
| 30b | Metadata/credit errors on streaming | 2 | 6 | 5 | 7 | 3 | 3 | 3 | **3.3** | 3rd-party dependent |
| 21 | Generic space-booking mismatch (rehearsal) | 5 | 5 | 5 | 6 | 5 | 7 | 6 | **3.5** | Jammed already competent |
| 26 | Practice-tracking app unreliability (Tonara) | 7 | 6 | 3 | 7 | 5 | 5 | 6 | **3.5** | DSP scope-creep risk |
| 11 | Beat-licensing contracts informal | 4 | 5 | 6 | 6 | 4 | 8 | 6 | **3.5** | |
| 18 | Rehearsal scheduling coordination (bands) | 5 | 4 | 3 | 5 | 2 | 9 | 4 | **3.3** | Free tools "good enough" |
| 12 | COI repeated collection | 3 | 3 | 4 | 5 | 2 | 7 | 2 | **3.3** | |
| 14 | Hospitality riders ignored | 3 | 4 | 3 | 5 | 2 | 7 | 2 | **3.3** | |
| 22 | Generic scheduling mismatch (lessons) | 5 | 5 | 5 | 6 | 5 | 7 | 8 | **2.8** | Already well-served |
| 28 | Marketplace trust/vetting (GigSalad/GigMasters) | 4 | 6 | 6 | 8 | 4 | 3 | 7 | **2.8** | Liquidity problem |
| 36 | Voice-memo/idea-capture chaos | 6 | 4 | 2 | 6 | 3 | 7 | 7 | **2.3** | Crowded, low WTP |
| 35 | WhatsApp band comms losing context | 6 | 3 | 1 | 5 | 2 | 8 | 6 | **2.2** | Discord/Notion suffice |
| 29 | Platform mortality risk (Songkick/Sonicbids) | 1 | 5 | 4 | 5 | 2 | 3 | 5 | **1.7** | Not a product |

---

## 5. Major competitor map

| Product | Segment | Price (as found, see caveat above) | Strongest feature | Weakness / complaint | Saturation read |
|---|---|---|---|---|---|
| **My Music Staff** | Teachers/studios | ~$16.95/mo | Reliable billing+attendance | Buggy reports, slow support | Established leader |
| **Fons** | Teachers | ~$19.95/mo | Auto-payment collection ("never missed a payment") | Price jumps, clunky editing | Executing well |
| **Duet Partner** | Solo teachers | Free/discounted entry | "Saved hours every week" per teacher quote | Payment-stuck complaint (1 case) | Affordable-option niche |
| **Teachworks** | General tutoring incl. music | $16.49–$187.99/mo + per-lesson fee | Payroll support | Not music-specific; usage-based pricing surprises | Horizontal tool stretched to fit |
| **Opus1.io** | Multi-teacher schools | Unverified | Most feature-complete for multi-teacher admin | No dedicated mobile app | Power-user choice |
| **Tonara** | Practice tracking | Unverified | Gamified practice, teacher messaging | Severe reliability bugs → documented mass exodus | Weakening incumbent |
| **DistroKid / TuneCore / CD Baby / Amuse / ONErpm / Vydia** | DIY distribution | $22–80/yr or % commission (varies) | Cheap, ubiquitous, fast | Systemic payment-delay/suspension complaints across nearly all of them | Saturated but *trust-damaged* |
| **Songtrust / Auddly (Session)** | Publishing admin, splits | Songtrust % of royalties; Auddly free | Backed by major songwriters (Auddly) | Songtrust: multi-year non-payment complaints | Crowded (splits), thin (admin) |
| **SPLITS / SplitChord / SongSplits / CoWriter IO** | Split sheets | Mostly free | Fast in-session signing | 4+ near-identical entrants, no clear winner | Saturated |
| **HitSend** | Mix/master client approval | $34.99–39.99/mo | Consolidates feedback+invoicing | "Price is way too high" complaint | Thin, one real competitor |
| **DropCue / Disco.ac** | Sync/composer sharing | DropCue $5–15/mo; Disco.ac ~$69/mo all-in | DropCue: transparent pricing | Disco.ac: pricing opacity complaints | Thin, 2 players |
| **BandHelper / Back On Stage** | Bandleader all-in-one | Subscription (Back On Stage $26–29/mo) | Comprehensive (setlists→invoicing) | "Too complicated," subscription fatigue | Moderately served duopoly |
| **StagePlot Guru** | Stage plots | $4.99–7.99 one-time | Category-defining, established | Paywalled beyond 4 props, 6 yrs unresolved complaints | Stagnant incumbent — real gap |
| **GigSalad / GigMasters (The Bash)** | Booking marketplace | Annual fee + 5–15% commission | Lead volume | 2.3★/2.x★ ratings; no-show/fraud complaints | Entrenched, trust-damaged duopoly |
| **Jammed** | Rehearsal-studio booking | ~$20/mo/room | Purpose-built for hourly room rental | Minor email-clarity complaint | Thin niche, well-served |
| **Skedda / SimplyBook.me** | General space/appointment booking | $10–39/mo | General-purpose, mature | "Not designed for musicians" | Repurposed, not purpose-built |
| **Master Tour (Eventric) / Prism.fm / Gigwell** | Professional touring/venue ops | $99–250+/mo, enterprise-gated | Full logistics suite | Priced/scoped for professional operations, not small acts | Enterprise-only — gap below it |
| **SetBook** | Session-player gig tracking | Unverified | Directly targets Problem #1 | Immature/unverified, low visibility | Found but not corroborated — worth a direct look |

---

## 6. Evidence of unmet needs

The clearest cross-cutting evidence pattern, repeated independently across all four research passes: **paying customers of mature tools still resort to spreadsheets for the layer their software doesn't cover.**

- Teachers who pay My Music Staff or Fons for billing still buy Etsy repertoire-tracking spreadsheets.
- Session musicians with 100+ gigs/year build their own Notion income trackers because "there are not any solutions tailored specifically to freelance musicians."
- Recording-studio owners share a homemade Excel profitability model on Gearspace, in a segment full of paid software options.
- Bands still coordinate via a plain shared Google Calendar for availability — "if you don't mark unavailable, you're expected to show" — a manual social contract standing in for real conflict-detection software.

This is a much stronger signal than "no product exists" — it's "a product exists, is paid for, and is still insufficient," which is the sharpest kind of evidence this brief asked for. It concentrates almost entirely around **money tracking** (income, splits, payments owed) and **repertoire/progress tracking** — both structured-data problems well within a one-developer Next.js/Postgres build, and both explicitly excluded from what mature competitors currently do well.

---

## 7. 10 product opportunities

### Opportunity 1 — Gig Wallet
**A. Concept:** A gig-income and invoicing tracker built for musicians who get paid in dozens of small, irregular amounts from many different clients.
**B. Exact user:** A working session musician or solo performer doing 40–150+ paid engagements a year across multiple clients/venues/studios, with no bookkeeper.
**C. Painful job:** Knowing what they've earned, who still owes them, and having clean numbers ready for tax time — without opening three apps and a calculator.
**D. Current workaround:** Homemade Notion boards, purchased Gumroad/Airtable gig-income spreadsheet templates, mental math.
**E. Evidence:** [thatviolakid.substack.com — "You're not disorganized. Your systems are broken."](https://thatviolakid.substack.com/p/youre-not-disorganized-your-systems); [thatviolakid.substack.com — "Why I Track Gigs as an LA String Player"](https://thatviolakid.substack.com/p/why-i-track-gigs-as-an-la-string) (160 paid gigs in 2024 alone); michaelmusco.com on money "leaking" between the session and the follow-up; a live market of paid Gumroad/Etsy gig-tracker spreadsheet templates.
**F. Why existing products fail:** Generic invoicing tools (QuickBooks, Zoho) aren't built for dozens-of-tiny-clients-per-month; teacher/studio tools (Fons, My Music Staff) are built around recurring lesson billing, not one-off session/gig payments; SetBook exists but is small, unverified, and low-visibility.
**G. Why someone pays:** Tax-season time savings, fewer missed/late payments, professional invoices that make chasing payment easier.
**H. Frequency:** Weekly-to-per-gig use; daily relevance during tax season.
**I. MVP (5 functions):** (1) Log a gig/session with client, fee, date, expenses; (2) generate and send a branded invoice (PDF + email); (3) track paid/unpaid status with automatic reminder emails; (4) year-end summary export (CSV/PDF) for taxes; (5) simple dashboard: total earned, outstanding, by client/month.
**J. What not to build:** Full accounting/bookkeeping suite, payroll, bank integration, tax filing, mileage GPS tracking (a simple manual mileage field is enough).
**K. Claude Code feasibility: Easy.** Forms, Postgres, PDF generation, transactional email, a dashboard with charts — no novel technical risk.
**L. External dependencies:** Email delivery (Resend/Postgres), PDF generation library, Stripe only if adding optional online payment collection (not required for MVP).
**M. Competition risk: Low.** SetBook is the only real dedicated competitor found, and it's unverified/thin; the rest of the field is generic tools or spreadsheets.
**N. Pricing:** $6–12/month or ~$60/year — compare against Fons/My Music Staff ($17–20/mo) but this does less, so should price below.
**O. Commercial risk:** Musicians may expect a free spreadsheet template to be "good enough" (many are actively buying $10–20 one-time templates rather than a subscription); needs to prove the recurring-reminder/invoicing automation is worth a subscription over a static spreadsheet.

### Opportunity 2 — SplitNight
**A. Concept:** A 90-second gig-payout splitter and running band-ledger for closing out tonight's show.
**B. Exact user:** The treasurer/leader of a 3–6 piece working covers or function band who divides cash/PayPal payout after every gig.
**C. Painful job:** Fairly and transparently splitting tonight's fee (minus expenses, PA-owner cut, etc.) without a recurring argument, and keeping a record everyone can see.
**D. Current workaround:** Mental math, group-chat announcements of who got what, occasional disputes over unequal contribution (gear, driving).
**E. Evidence:** Harmony Central ("How do you split GIG money?"), Drum Forum, Music Player Network forum threads describing recurring disputes; Band Pencil built a free gig-settlement calculator purely as a lead magnet.
**F. Why existing products fail:** No dedicated, widely-used tool found; band-management suites (BandHelper) don't focus on this; math is currently done ad hoc and undocumented, so disputes recur.
**G. Why someone pays:** Removes a recurring source of interpersonal friction in a band, keeps an auditable record, worth it even at low price for the goodwill it preserves.
**H. Frequency:** Per gig (weekly for active bands).
**I. MVP (5 functions):** (1) Enter gig fee + expenses; (2) define split rule (equal / custom % / off-the-top cuts for gear or driving); (3) instant calculated breakdown; (4) shareable summary (link or PDF) visible to all members; (5) running per-member ledger across gigs.
**J. What not to build:** Actual payment processing/payouts (Venmo/cash stays outside the app), tax handling, full band-management features (setlists, scheduling).
**K. Claude Code feasibility: Easy.** Essentially a calculator with persistence and a share link — one of the simplest possible MVPs in this whole report.
**L. External dependencies:** None required for MVP beyond basic auth and a shareable link.
**M. Competition risk: Low.** GigSplitPay exists but is low-visibility; no dominant player.
**N. Pricing:** Likely a free or low one-time/annual per-band fee ($15–25/yr per band) rather than per-user recurring — the value is too small per event to sustain a high monthly price alone; best sold bundled as a module inside Opportunity 1 or 4 once traction is proven.
**O. Commercial risk:** The task itself is small enough that bands may feel entitled to do it for free forever; monetization likely requires bundling rather than standing alone.

### Opportunity 3 — GigContract
**A. Concept:** Booking contracts, deposits, and e-signatures built specifically for wedding/function-band bookings.
**B. Exact user:** The bandleader of a wedding/function band booking 20–50 private (non-venue) events a year directly with couples/clients.
**C. Painful job:** Getting a signed agreement and deposit locked in fast enough to hold the date, without hiring a lawyer or hand-editing a Word template for every booking.
**D. Current workaround:** Generic wedding-vendor or legal-template sites (LawInsider, Rocket Lawyer, CMU sample contracts), manual PDF + email.
**E. Evidence:** Legal GPS explainer on payment-structure/contract gaps for band performances; a real JustAnswer legal-advice thread from a couple/band disputing a signed wedding-band contract; the existence and rivalry of BandHelper vs. Back On Stage (both partially address this).
**F. Why existing products fail:** BandHelper/Back On Stage bundle this inside a much larger, more complex all-in-one tool that reviewers call "too complicated"; generic wedding-vendor CRMs (Tripleseat, WedPro) aren't music-specific and don't handle deposit-to-final-payment gig cash flow.
**G. Why someone pays:** A deposit collected before the date is real, protected revenue; a broken/unenforced verbal agreement is a real financial loss (cancelled wedding, no recourse).
**H. Frequency:** Per booking (weekly-to-monthly for an active wedding band).
**I. MVP (5 functions):** (1) Reusable contract template with client/date/fee fields; (2) e-signature; (3) deposit collection (Stripe) tied to signing; (4) automatic balance-due reminder before the event; (5) a simple booking calendar showing signed vs. pending dates.
**J. What not to build:** General event/venue CRM, marketing/lead-gen, legal advice generation.
**K. Claude Code feasibility: Moderate.** E-signature + Stripe deposit flow is well-trodden but real integration work; no novel technical risk, just more moving parts than Opportunities 1–2.
**L. External dependencies:** E-signature provider (or a simple checkbox-based enforceable-signature flow used by many small SaaS), Stripe for deposits. Contract legal validity across jurisdictions is a real (if modest) legal-review consideration.
**M. Competition risk: Medium.** BandHelper/Back On Stage already bundle a version of this; a standalone tool needs to win on being radically simpler.
**N. Pricing:** $10–20/month per band, or per-booking fee (e.g., 1% of deposit) — compare against Back On Stage's $26–29/mo for the full suite; price meaningfully lower for a narrower tool.
**O. Commercial risk:** Bandleaders satisfied with a Word template + email may not see enough marginal value to pay monthly for just this slice.

### Opportunity 4 — DepBook
**A. Concept:** A vetted-contact-book and availability tool for finding and briefing a same-week deputy/substitute musician.
**B. Exact user:** The leader/fixer of a wedding/function-band circuit who needs to replace a sick or double-booked player within days, without falling back to an unvetted Facebook group post.
**C. Painful job:** Finding someone who can actually play the gig (right instrument, style, availability) fast, and getting them the setlist/charts/logistics without a scramble of texts.
**D. Current workaround:** A Facebook group with 47,000+ members, used with multiple posts per day, with no vetting, availability calendar, or accountability.
**E. Evidence:** For Funk Sake blog ("The Dep Culture") on deps being poached by higher bids and the risk of an all-substitute "scratch band"; the scale and cadence of the Facebook-group workaround itself.
**F. Why existing products fail:** No dedicated tool found; the informal Facebook-group economy has zero structure — no availability calendar, no reliability track record, no automatic briefing pack (setlist/charts/venue details) handoff.
**G. Why someone pays:** A missed or badly-briefed dep gig can mean a refund to a client or reputational damage with a venue — real downside risk a leader will pay to reduce.
**H. Frequency:** Per crisis (irregular, but high-stakes when it happens; a leader running a busy circuit may need this monthly).
**I. MVP (5 functions):** (1) Personal contact book of vetted deps by instrument/style with notes; (2) quick availability-check broadcast to a shortlist; (3) one-click briefing pack (setlist, venue address, dress code, fee) sent to the confirmed dep; (4) reliability notes/history per dep; (5) shareable "who's covering this gig" status for the rest of the band.
**J. What not to build:** A public open marketplace/discovery matching strangers (this is the GigSalad/GigMasters trap — trust and liquidity are extremely hard to bootstrap); keep it a private tool for a leader's own network, not a two-sided marketplace, at least for the MVP.
**K. Claude Code feasibility: Moderate.** Contact management + broadcast messaging + shareable briefing pack is buildable, but designing this to *not* become a marketplace (per J) requires real product discipline.
**L. External dependencies:** SMS/email for the availability broadcast (Twilio or email is sufficient — no need for in-app real-time chat in the MVP).
**M. Competition risk: Low today, rising if it works** — no direct competitor found, but a working version of this is an obvious template for GigSalad/GigMasters to copy, or for someone to turn into a full marketplace.
**N. Pricing:** $10–15/month per bandleader.
**O. Commercial risk:** The value depends on the leader already having a decent private network of deps — it organizes an existing relationship rather than creating one, so it doesn't solve the problem for leaders who don't already know enough players.

### Opportunity 5 — StagePlot Redux
**A. Concept:** A modern, free-tier-generous stage-plot and input-list builder to replace the stagnant category leader.
**B. Exact user:** The band member (usually the leader or the one who "does tech stuff") preparing a stage plot/input list for a show at an unfamiliar venue with an unknown sound engineer.
**C. Painful job:** Producing a clear, professional stage plot and input list the venue's FOH engineer can actually read, without hitting an arbitrary paywall for basic use.
**D. Current workaround:** StagePlot Guru (paywalled beyond 4 props, described as cluttered, missing modern gear icons), or a hand-drawn/PowerPoint plot.
**E. Evidence:** apptail.io and saashub.com aggregated reviews: "must buy the pro version to get more than 4 props," "missing equipment types like low profile wedges, RF, and pedalboards," "low rating with ongoing issues that have persisted for 6 years."
**F. Why existing products fail:** The category leader has visibly stagnated (6 years of unresolved complaints per public review aggregation) while charging for basic functionality; the rest of the field (StageBuilder Pro, Stage Plot Creator, Stageplot Pro, StageOn.app, Stage Plan Master) is fragmented with no clear winner.
**G. Why someone pays:** A clear stage plot reduces line-check time and miscommunication with an unfamiliar sound crew — a small but real professionalism/time payoff.
**H. Frequency:** Per show at a new venue (infrequent per band, but recurring across a touring/gigging season).
**I. MVP (5 functions):** (1) Drag-and-drop stage plot builder with a modern, complete icon set; (2) auto-generated matching input list; (3) shareable link + PDF export; (4) save/duplicate plots per venue/tour; (5) basic branding (band name/logo on export).
**J. What not to build:** 3D rendering, hardware/patch-bay simulation, integration with venue PA systems — StageBuilder Pro already occupies the "3D" high end; don't chase it.
**K. Claude Code feasibility: Easy.** A canvas-based drag-and-drop editor with a fixed icon library and PDF export is a well-understood web-app pattern, no novel technical risk.
**L. External dependencies:** None beyond standard PDF export tooling.
**M. Competition risk: Medium.** Several small competitors exist; none dominant, but the bar to be "clearly better than a 6-year-stagnant incumbent" is not that high.
**N. Pricing:** Freemium — free for basic plots, $4–8/month or ~$30/year for unlimited saved plots/venues and PDF branding. Low per-show frequency argues for a cheap, mostly-free model over a premium subscription.
**O. Commercial risk:** Low frequency of use per band caps recurring revenue potential; may work better as a one-time-purchase "pro unlock" than a subscription.

### Opportunity 6 — Repertoire Sheet
**A. Concept:** A repertoire-and-student-progress tracker for independent music teachers, designed to sit alongside (not replace) their existing billing software.
**B. Exact user:** An independent 1-on-1 instrumental/vocal teacher with 15–40 regular students, who already uses (or doesn't use) a billing tool like Fons/My Music Staff but tracks each student's pieces/progress by hand.
**C. Painful job:** Knowing at a glance what each student is working on, what they've completed, and being able to show parents/students visible progress.
**D. Current workaround:** Paid Etsy/Gumroad spreadsheet and printable-template purchases (colorinmypiano.com, pianopantry.com), notebooks with student dividers.
**E. Evidence:** A live market of paid spreadsheet/printable repertoire-tracker templates sold peer-to-peer on Etsy, used by teachers even where paid studio-management software (which theoretically could add this) already exists — the single clearest "paying customers still resort to spreadsheets" example in the whole research set.
**F. Why existing products fail:** My Music Staff/Fons/Duet Partner are optimized for scheduling and billing, not repertoire/progress detail; teachers report no dominant, well-loved repertoire-tracking feature among them, hence the parallel spreadsheet cottage industry.
**G. Why someone pays:** Visible progress builds parent retention/trust (a soft but real revenue-protection benefit for a teacher whose income depends on student retention).
**H. Frequency:** Weekly (per lesson).
**I. MVP (5 functions):** (1) Per-student repertoire list (piece, level, status: assigned/in-progress/mastered); (2) quick post-lesson update flow; (3) a shareable/printable progress summary for parents; (4) simple library of common method-book/piece references to speed entry; (5) basic historical view ("what has this student played this year").
**J. What not to build:** Billing, scheduling, video lessons, gamified practice tracking (the Tonara-style DSP-adjacent territory this brief asked to avoid).
**K. Claude Code feasibility: Easy.** CRUD app with a simple per-student data model and PDF/print export — no technical risk.
**L. External dependencies:** None beyond optional PDF export.
**M. Competition risk: Medium.** Not competing against a dedicated rival (none found), but against "good enough" free spreadsheet templates and the risk that an incumbent (My Music Staff) adds this as a feature.
**N. Pricing:** $4–7/month, priced as a cheap add-on rather than a full studio-management replacement.
**O. Commercial risk:** Real risk this is a *feature*, not a *product* — an incumbent could ship this in a point release and remove the reason to pay separately; needs either genuine product depth (real curriculum-tracking value) or a clear integration story with the billing tools teachers already pay for.

### Opportunity 7 — RoomBook
**A. Concept:** Hourly booking and no-show deposit automation purpose-built for small rehearsal studios.
**B. Exact user:** The owner-operator of a 1–4 room rehearsal-space business renting hourly slots to local bands.
**C. Painful job:** Filling rooms, collecting deposits up front, and not losing revenue to no-shows/late cancellations.
**D. Current workaround:** Skedda or SimplyBook.me (general-purpose tools), described by at least one studio owner as having "a severe lack of online bookings that are suitable for the way a rehearsal space works."
**E. Evidence:** Studio cancellation policies documented across multiple studios (Fort Knox Studios, Labyrinth Studios) as the primary defense against no-shows; a Jammed reviewer's direct complaint about generic tools; Gearspace veteran-studio-owner thread on standard 50% deposit practice.
**F. Why existing products fail:** Skedda/SimplyBook.me are general room/appointment booking tools not tuned to hourly-rate rehearsal-room rental workflows (deposit-to-hold, per-hour pricing, gear add-ons).
**G. Why someone pays:** Directly protects revenue against no-shows — a studio's core cash-flow risk.
**H. Frequency:** Multiple bookings per day per studio (business-critical, not occasional).
**I. MVP (5 functions):** (1) Online booking calendar with per-room hourly rates; (2) deposit collection at booking (Stripe); (3) automated cancellation-policy enforcement (deposit forfeited under X hours' notice); (4) automated reminder to reduce no-shows; (5) simple revenue/occupancy dashboard for the owner.
**J. What not to build:** Equipment inventory/condition tracking (evidence for this was speculative, not confirmed — see Problem #17/#37), POS/point-of-sale, multi-location franchise management.
**K. Claude Code feasibility: Easy–Moderate.** Booking calendar + Stripe deposits is a well-understood pattern; the main design work is nailing the deposit/cancellation-policy logic.
**L. External dependencies:** Stripe for deposits/payments.
**M. Competition risk: Medium-High.** Jammed already exists and is well-regarded for exactly this niche — a new entrant needs a real differentiator (price, specific feature, better onboarding), not just presence.
**N. Pricing:** $15–25/month per room (comparable to or slightly below Jammed's ~$20/month/room).
**O. Commercial risk:** Small total addressable market (independent rehearsal studios are not a huge population) and an incumbent already serving it reasonably well — the weakest buildability-to-competition ratio of the group.

### Opportunity 8 — MixApprove
**A. Concept:** A lightweight mix/master revision-approval and invoicing hub for freelance mixing/mastering engineers, positioned as a cheaper, simpler alternative to HitSend.
**B. Exact user:** A freelance mixing/mastering engineer with 5–15 recurring clients, currently juggling WeTransfer/Dropbox, email feedback, and separate PayPal/Stripe invoices.
**C. Painful job:** Getting clear, timecoded feedback on a mix, tracking how many revision rounds are included/used, and getting paid without three separate tools.
**D. Current workaround:** Email threads + WeTransfer/Dropbox + ad hoc PayPal/Stripe invoicing; HitSend exists as a paid alternative.
**E. Evidence:** HitSend's own product positioning and press coverage (MusicRadar) directly names this workflow as broken; a HitSend reviewer: "the price is way too high... great concept though" — real willingness-to-pay signal paired with a real price-sensitivity ceiling.
**F. Why existing products fail:** HitSend is real competition here, not an absence — its main weakness per available evidence is price ($35–40/month felt steep to at least one reviewer for a freelance engineer's typical margins).
**G. Why someone pays:** Faster approval cycles mean faster payment and fewer stalled projects; consolidating three tools into one is a real time savings.
**H. Frequency:** Per project (weekly-to-monthly depending on the engineer's volume).
**I. MVP (5 functions):** (1) Upload a mix version, get a shareable timecoded-comment link (using the Web Audio API — no DSP/ML required, just waveform display + comment pins); (2) revision-round counter tied to the client's contract terms; (3) client approval/sign-off action; (4) invoice generation tied to milestones (deposit / on-approval); (5) simple project list with status (in review / approved / paid).
**J. What not to build:** Any actual audio processing/mastering tools, stem separation, DAW plugin integration — this is purely a communication/approval/invoicing layer around files the engineer already has.
**K. Claude Code feasibility: Moderate.** Waveform rendering + timecoded comments is more involved than a plain CRUD app but is a well-trodden web-audio pattern (no ML/DSP needed — just decoding audio for a visual waveform and pinning comments to a timestamp).
**L. External dependencies:** File storage (S3-compatible), Stripe for invoicing.
**M. Competition risk: Medium-High.** HitSend is a real, semi-mature, well-covered competitor — a new entrant's only real lever is being meaningfully cheaper and simpler, which is a thin moat.
**N. Pricing:** $12–20/month, undercutting HitSend's $35–40/month.
**O. Commercial risk:** Head-to-head against an existing, press-covered competitor; winning purely on price against a product with real storage/infrastructure costs (250GB+/user) may not be sustainable at a much lower price point.

### Opportunity 9 — CueTrack
**A. Concept:** A placement and royalty tracker for media (film/TV/game) composers — "which of my cues aired where, and did I get paid for it."
**B. Exact user:** A working TV/film composer scoring multiple shows/episodes per year, submitting cue sheets across several production companies.
**C. Painful job:** Knowing which cues have actually been filed/paid by production companies, and catching missing/late cue sheets before rerun income is lost.
**D. Current workaround:** A manual spreadsheet (explicitly recommended in industry guides) tracking Track/ISRC/Library/Submission Date/Placement/Fee/Payment Date; a dedicated MusicLibraryReport forum exists specifically because cue sheets "disappear."
**E. Evidence:** MusicLibraryReport's dedicated "Cue Sheet Problems" sub-forum documenting cue-sheet counts dropping by "several hundred… across 40 different series," shows filing "a year after episodes aired"; That Pitch's explicit spreadsheet-tracking recommendation; existence of small dedicated tools (Trqk, Composer Catalog).
**F. Why existing products fail:** Composers have almost no control over whether a production company files a cue sheet correctly or on time — existing tools (Trqk, Composer Catalog) only help the composer track their own half of the paperwork, not force compliance from production companies.
**G. Why someone pays:** Rerun/syndication royalties depend directly on filed cue sheets — money is left on the table if a composer can't tell what's missing.
**H. Frequency:** Per project/episode (recurring for an active working composer, but a much smaller total population than any freelancer-money segment above).
**I. MVP (5 functions):** (1) Log each cue/placement with show, episode, ISWC, production company, submission date; (2) status tracking (submitted / confirmed filed / payment received); (3) reminder when a cue sheet is overdue based on typical filing windows; (4) simple year-over-year royalty-received summary; (5) exportable cue-sheet-ready data for the composer's own PRO submissions.
**J. What not to build:** Automated cue-sheet filing with PROs/production companies (no data access to do this reliably), royalty calculation/payment (that stays with the PRO/publisher).
**K. Claude Code feasibility: Easy.** Structured logging + reminders + export — no technical risk, similar shape to Opportunity 1.
**L. External dependencies:** None required for MVP.
**M. Competition risk: Low.** Trqk and Composer Catalog exist but are small/unverified; genuinely thin niche.
**N. Pricing:** $10–15/month — but see commercial risk below.
**O. Commercial risk:** Small total addressable market — working film/TV composers are a narrow professional population, meaning this is a low-ceiling opportunity even if perfectly executed; better suited as a "nice to have later" than an initial bet.

### Opportunity 10 — AdvanceSheet
**A. Concept:** A show-advancing and hospitality-rider communication tool connecting touring acts and the small/mid venues they play.
**B. Exact user:** A tour manager or self-managing bandleader advancing 10–30 shows a year with small-to-mid independent venues (not stadium-scale tours, which already have Master Tour/Prism.fm-class tools).
**C. Painful job:** Getting load-in time, tech specs, hospitality, and parking/logistics confirmed with each venue ahead of a show, without a 40-email thread per date.
**D. Current workaround:** Email/phone/WhatsApp per show, per the only evidence found (a vendor blog, not a first-hand quote).
**E. Evidence:** *Weakest evidence in this report* — a single vendor blog (stageportal.gg) claiming "40 emails per show advance," and an insurer's free-COI-reissuance feature implying repeated friction. No first-hand touring-musician or venue-side complaint was found in this research pass.
**F. Why existing products fail:** Existing tour-management tools (Master Tour, Prism.fm, Gigwell) are priced/scoped for professional touring operations ($99–250+/month, often demo-gated), leaving a real gap below them — but this is inference from pricing/positioning, not a confirmed complaint from a small touring act.
**G. Why someone pays:** Fewer show-day surprises (missing gear, wrong load-in time) reduce real financial/reputational risk on tour.
**H. Frequency:** Per show (weekly during an active tour).
**I. MVP (5 functions):** (1) Per-show advance sheet template (load-in, tech specs, hospitality, parking); (2) shareable link both venue and band can view/edit their half of; (3) status tracking (confirmed / pending per field); (4) attached rider/stage-plot documents; (5) simple tour-wide calendar view of all upcoming advances.
**J. What not to build:** Full tour-logistics suite (travel, hotel booking, crew payroll) — that's Master Tour's territory and out of scope for a lean MVP.
**K. Claude Code feasibility: Easy.** Structured forms + shareable links — no technical risk.
**L. External dependencies:** None required for MVP.
**M. Competition risk: Low-Medium.** No direct small-act-focused competitor found, but also the weakest evidence this problem is acute enough to pay for.
**N. Pricing:** $10–20/month per touring act.
**O. Commercial risk:** **Highest of the ten** — this idea rests on inference from a single self-interested vendor source, not a confirmed first-hand complaint; strongly recommend treating this as the first candidate to kill if a validation interview doesn't independently surface the pain unprompted.

---

## 8. Ranked top 10

1. **Gig Wallet** — best evidence, best buildability, clearest willingness-to-pay, thinnest real competition.
2. **SplitNight** — near-zero build cost, proven appetite (a free calculator already exists as a lead magnet), but modest standalone revenue ceiling.
3. **DepBook** — largest total addressable pain (a 47,000-member informal Facebook economy), but real two-sided-marketplace execution risk.
4. **GigContract** — real money at stake per booking, but medium competition from BandHelper/Back On Stage bundling a version of this already.
5. **Repertoire Sheet** — the clearest "even paying customers still use a spreadsheet" evidence in the whole dataset, but real risk of being a feature, not a product.
6. **StagePlot Redux** — a genuinely stagnant incumbent to beat, easy build, but low per-band usage frequency caps subscription revenue.
7. **Rehearsal-studio no-shows / RoomBook** — well-evidenced pain, but Jammed already serves this niche reasonably well.
8. **MixApprove** — real pain, but head-to-head against an existing, press-covered competitor (HitSend) with a thin price-based moat.
9. **CueTrack** — solid niche fit, but a narrow professional population caps the ceiling.
10. **AdvanceSheet** — weakest evidence of the ten (single vendor-blog source); prime candidate to kill early in validation.

**Explicitly excluded from the top 10 despite raw scores:** distributor payment delays (Problem #5) — the highest-scoring problem in the raw table, but fixing it would mean becoming a financial intermediary between artists and DSPs, which fails the "credible one-developer MVP" test and carries real regulatory exposure; split-sheet disputes (Problem #9) — real pain but a saturated market with 5+ funded competitors; marketplace trust/vetting on GigSalad/GigMasters (Problem #28) — real pain but a hard two-sided-liquidity problem against entrenched incumbents; YouTube Content ID (Problem #31) and streaming metadata errors (Problem #30) — real pain, but the only fix routes through a large third party (YouTube, a DSP) with no independent product wedge available.

---

## 9. Top 3 commercial opportunities

Ranked purely by size of financial opportunity if fully realized, independent of ease of building:

1. **Gig Wallet** — largest, best-evidenced, most frequent pain of anything in the research; also happens to be easy to build.
2. **DepBook** — the underlying informal economy (47,000+ people in one Facebook group alone) suggests real scale if trust/liquidity can be cracked, though this is the riskiest bet of the three.
3. **GigContract** — real, recurring, per-booking money at stake (deposits, cancellations) across a large population of working wedding/function bands.

---

## 10. Top 3 commercial/buildability opportunities

Ranked by best ratio of commercial upside to how easy and low-risk the MVP is:

1. **Gig Wallet** — appears in both lists: strong opportunity *and* trivially buildable.
2. **SplitNight** — the single cheapest MVP in this report relative to a real, evidenced pain point.
3. **StagePlot Redux** — a stagnant, disliked incumbent and an easy, well-understood build (drag-drop editor + PDF export).

---

## 11. Kill criteria

For every top-ranked idea, here is the evidence that would justify abandoning it before writing code:

- **Gig Wallet:** Interview subjects say they'd only use a *free* version, or that a free spreadsheet template genuinely meets their needs once they see one; or session musicians say tax season is rare/light enough that they don't mind doing it once a year by hand.
- **SplitNight:** Bands say the math takes 30 seconds already and isn't worth an app for; no one is willing to pay even a small annual fee, confirming it's a feature, not a product.
- **DepBook:** Bandleaders say they already have "enough deps" and don't experience the crisis often enough to pay for a tool; or the existing Facebook group is judged "good enough" despite its flaws (free, wide reach beats paid, narrow, vetted).
- **GigContract:** Bandleaders show us the Word template they already use and say it's never caused a problem; or BandHelper/Back On Stage's existing contract feature is judged sufficient by several interviewees.
- **Repertoire Sheet:** Teachers say they'd only ever use a free spreadsheet template and see no reason to pay for a digital version; or several interviewees say My Music Staff/Fons already covers this well enough (contradicting the research evidence, which is possible if the research sample was unrepresentative).
- **StagePlot Redux:** Bands say they make one stage plot per year and reuse it forever, so frequency is too low to matter; or interviewees are happy paying StagePlot Guru's one-time fee and don't mind its limits.
- **AdvanceSheet:** Interviewees don't recognize the "40 emails per advance" pain unprompted — if the vendor-blog claim doesn't hold up in a real conversation, kill this immediately; it was the weakest-evidenced idea from the start.
- **General, applies to all:** if customer acquisition cost (via Facebook groups, forums, Reddit, direct outreach to teacher/musician communities) turns out to require paid ads to reach a fragmented, low-trust audience, the unit economics likely don't work at $5–20/month price points — a signal to abandon rather than push through.

---

## 12. Pre-development validation experiments

**Do not build an MVP before running these.** For the three highest-ranked overall opportunities (Gig Wallet, SplitNight, StagePlot Redux):

### Gig Wallet
- **Who to interview:** 8–12 working session musicians and solo performers (not teachers) who play 30+ paid engagements/year.
- **Where to find them:** r/WeAreTheMusicMakers, local musicians' union chapters, Facebook groups for session players in a specific city, direct outreach to musicians who've written publicly about gig-tracking (e.g., replying respectfully to the ThatViolaKid Substack).
- **10 interview questions:**
  1. Walk me through what happens right after you get paid for a gig — what do you actually do to record it?
  2. How do you currently know what you earned last month? Last year?
  3. Have you ever lost track of who still owed you money? What happened?
  4. What do you use today — spreadsheet, notes app, nothing?
  5. What's the worst part of getting ready for tax season?
  6. Have you ever paid for a tool specifically for this? Why or why not?
  7. If a tool sent an automatic reminder to a client who hadn't paid you, would you actually use that, or does it feel awkward?
  8. What would make you trust a new tool with your income data?
  9. What's the single most annoying step in your current process?
  10. If this existed and cost $8/month, would you try it? What would make you cancel after a month?
- **Landing-page proposition:** "Know what you earned. Know who still owes you. Built for musicians who play more gigs than they can track."
- **Proposed price:** $8/month or $70/year, shown on the landing page.
- **CTA to test:** Email waitlist signup + a $1 pre-order/deposit to gauge real intent (not just interest).
- **Strong validation:** 15%+ of targeted-audience landing-page visitors join the waitlist; several interviewees say "I already tried to build this myself in a spreadsheet."
- **Abandon signal:** Under 3% conversion despite reaching the right audience; repeated "I'd only use this if it were free."

### SplitNight
- **Who to interview:** 8–10 leaders/treasurers of active gigging bands (3–6 members), found via local band Facebook groups, TalkBass/Harmony Central-style forums, or direct outreach in gig-economy musician communities.
- **10 interview questions:**
  1. Who handles the money after a gig in your band?
  2. Walk me through exactly how you split tonight's fee.
  3. Has an uneven split ever caused tension in the band? What happened?
  4. Do you keep any record of past splits, or is it settled and forgotten each time?
  5. Would a shared, visible record of "who got what" help or feel unnecessary?
  6. Do you ever deduct expenses (gas, gear rental) before splitting — how do you calculate that today?
  7. Would you pay a small annual fee for this, or does it feel like it should be free?
  8. Who in the band would actually be the one to use this tool?
  9. Have you ever looked for an app for this and given up?
  10. What would make this feel worth paying for versus just doing the math in your head?
- **Landing-page proposition:** "Split tonight's gig fairly, in 90 seconds. No more group-chat math."
- **Proposed price:** Free with a $19/year "unlimited history" tier.
- **CTA to test:** Direct "Try it free" — this idea should validate primarily on usage/retention, not willingness to pay, given the expected low price ceiling.
- **Strong validation:** Bands actually use it after more than 2 gigs (retention, not just signup); several interviewees spontaneously mention a past dispute this would have prevented.
- **Abandon signal:** Universal "we just do it in our heads and it's fine" with no memory of any dispute — the pain may be real but too mild to matter.

### StagePlot Redux
- **Who to interview:** 8–10 gigging/touring musicians who've made a stage plot in the last year, plus 3–4 FOH/sound engineers who receive them regularly.
- **10 interview questions:**
  1. When did you last make a stage plot? What tool did you use?
  2. What was frustrating about that process?
  3. Have you hit a paywall or limitation in a stage-plot tool? What happened?
  4. (To engineers) What's wrong with the stage plots you typically receive from bands?
  5. Do you reuse the same plot across shows, or make a new one each time?
  6. How do you currently share it with the venue/engineer?
  7. Would auto-generating a matching input list from the plot save you real time?
  8. Would you pay for this, or expect it to stay free?
  9. What's missing from the tool you use today (icons, gear types, layout options)?
  10. Who in the band is actually responsible for this — would they be the one paying?
- **Landing-page proposition:** "A stage plot your sound engineer can actually read. Free to start."
- **Proposed price:** Free tier (basic plot + PDF export), $4/month or $30/year for saved venues/tours and branding.
- **CTA to test:** "Build your first stage plot free" — direct product trial, since this idea lives or dies on whether people actually finish building a plot in it.
- **Strong validation:** Testers complete a full plot without abandoning; several unprompted mentions of frustration with StagePlot Guru's paywall.
- **Abandon signal:** Testers shrug and say their current one-time-purchase tool is "fine"; frequency of stage-plot creation turns out to be lower than assumed (e.g., once a year, reused forever) — undermining any recurring-revenue model.

---

## 13. Which ONE opportunity to investigate next, and why

**Gig Wallet.** It has the strongest, most independently corroborated evidence of any problem in this research (three of four research passes surfaced it unprompted); it is the easiest of the ten to build with a conventional Next.js/Postgres/Stripe stack, with zero ML/DSP/fragile-API risk; it has a real, if unverified, existing competitor (SetBook) worth a direct look before building, which itself is useful — either it's already solving this well (a kill signal) or it's weak enough that a better-built alternative has room. Most importantly, it targets the one pattern that shows up hardest across every segment researched: **paying customers of existing tools still keep a spreadsheet on the side for exactly this.** That is the sharpest evidence this brief asked for, and it points at money — not music theory, not a chord tool, not anything this research was told to avoid.

---

## Appendix: research limitations

- `WebFetch` was blocked by the research environment's network egress policy for nearly every external domain attempted (Reddit, Capterra, G2, Trustpilot, PissedConsumer, Gearspace, most vendor pricing pages, even Wikipedia) across all four research passes. All findings rely on `WebSearch`'s synthesized results, which frequently did surface direct quotes and links but could not be independently verified by loading the source page.
- Reddit-native sourcing — explicitly prioritized in the brief — was thin throughout; `site:reddit.com` queries consistently failed to surface usable thread content in this environment. A follow-up pass with working Reddit access would likely sharpen several of the "Moderate" and "Weak/Speculative" evidence grades above, particularly for band-comms, rehearsal-scheduling, and multi-teacher-studio-payroll pain.
- Each research pass hit a session-level search-call budget cap before exhausting its planned query list; several named products in the original brief (Loopz, Muzicasa, StagePlanner, Tourwrx, GigPlanner, Muzeek, Bandop, Jointly.io as a music tool) could not be confirmed to exist as described, and are flagged as such rather than force-fit into the competitor map.
- Segment coverage is uneven: live sound/technical crews and content-creator-musicians have the thinnest evidence base of the 18 segments in the brief; this report does not force a product opportunity into either segment given that gap, consistent with the brief's own instruction that concluding "no attractive opportunity here" is an acceptable and valuable outcome.
