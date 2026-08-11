# Armony

An interactive harmonic exploration environment for musicians: explore harmonic relationships,
understand where a chord can lead, hear the possibilities, see how to play them on your
instrument, and turn discoveries into chord progressions.

Product spec: [`docs/product-spec.md`](docs/product-spec.md). Architecture:
[`docs/architecture.md`](docs/architecture.md). Music engine design:
[`docs/music-engine.md`](docs/music-engine.md). Build status: [`docs/roadmap.md`](docs/roadmap.md).

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind CSS, Supabase (auth + Postgres), Stripe
(billing), Tone.js (audio), next-intl (English/Spanish). See `docs/architecture.md` for the full
rationale.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase/Stripe keys as those phases land
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
- `npm run test` — Vitest (domain/music-engine unit tests, `src/domain/**/*.test.ts`)

## Project layout

- `src/domain` — framework-free TypeScript music engine (notes, chords, keys, harmony, harmonic
  graph, instrument representations, entitlements). No React/Next/Supabase/Stripe imports here.
- `src/app` — Next.js routes: `src/app/[locale]` for the localized marketing site and the product
  at `/app`.
- `src/i18n`, `messages/` — next-intl routing/config and `en`/`es` message namespaces.
- `src/server` — Supabase/Stripe server-side integration (added from Phase 10 onward).
- `supabase/migrations` — SQL migrations (added from Phase 10 onward).

## Contributing / working with Claude Code

`CLAUDE.md` and `.claude/skills/` encode the persistent project rules and review skills
(`music-theory-review`, `product-scope-review`, `release-check`). Read `docs/roadmap.md` before
starting new work — the project is built in controlled phases, each verified (tests, typecheck,
lint, build) before the next begins.
