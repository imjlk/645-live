# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Source of Truth

When docs conflict, trust in this order:

1. `/README.md`
2. `/AGENTS.md`
3. Workspace READMEs:
   - `/pages/www/README.md`
   - `/workers/og-645-live/README.md`
   - `/services/trailbase/README.md`
4. Legacy docs (`/_docs/**`, `/TODO`)

## Project Overview

645.live is a Korean lottery (로또 645) statistics and analysis monorepo.

Primary workspaces:

- `pages/www`: SvelteKit app (Cloudflare Pages)
- `workers/og-645-live`: OG image Worker
- `packages/og-image-core`: shared OG rendering package
- `packages/trailbase-adapter`: reusable TrailBase adapter package
- `services/trailbase`: TrailBase depot + wasm guest + runtime assets

## Core Stack

- Frontend: SvelteKit 2 + Svelte 5 + TypeScript
- Backend/data: TrailBase + PostgreSQL 17
- ORM: Drizzle ORM
- Infra: Cloudflare Pages/Workers + Hyperdrive
- Package manager: Bun (default)
- Formatting/linting: Biome

## Quick Start

```bash
bun install
cp pages/www/.env.example pages/www/.env
cp workers/og-645-live/.env.example workers/og-645-live/.env

# PostgreSQL
bun run www db:start

# TrailBase runtime
bun run trail

# Web app
bun run www dev

# Optional: OG worker only
bun run og dev
```

## Common Commands

### Root

```bash
bun run format
bun run lint
```

### Web app (`pages/www`)

```bash
bun run www dev
bun run www build
bun run www preview
bun run www deploy
bun run www check
bun run www tail
bun run www db:start
bun run www db:push
bun run www db:generate
bun run www db:migrate
bun run www db:studio
```

### OG Worker (`workers/og-645-live`)

```bash
bun run og dev
bun run og deploy
```

### TrailBase WASM guest (`services/trailbase/wasm-guest`)

```bash
npm --prefix services/trailbase/wasm-guest run dev
npm --prefix services/trailbase/wasm-guest run build
```

## Environment Variables

Web app baseline (`/pages/www/.env.example`):

- `DATABASE_URL`
- `HYPERDRIVE_PROXY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `TRAILBASE_URL`
- `PUBLIC_TRAILBASE_URL`
- `TRAILBASE_BASIC_AUTH` (optional)

OG worker baseline (`/workers/og-645-live/.env.example`):

- `CACHE_ENABLED`
- `CACHE_MAX_AGE`

## Code Conventions

### Svelte 5 (Critical)

Use Svelte 5 runes syntax in Svelte components:

- state: `$state(...)`
- derived: `$derived(...)`
- effects: `$effect(...)`
- props: `$props()`

Avoid mixing legacy Svelte reactive syntax with runes in the same component.

### Style and tooling

- Use Biome formatting/lint rules.
- Keep imports explicit and type-safe.
- Prefer updating code/docs to match actual `package.json` scripts.

## TrailBase Notes

- Runtime depot lives at `services/trailbase/traildepot`.
- Custom routes/cron registration are in `services/trailbase/traildepot/scripts/index.ts`.
- Runtime DB files in `services/trailbase/traildepot/data/*.db` are not hand-edited.

## OG Worker Notes

- Worker entry: `workers/og-645-live/src/index.tsx`
- News route: `GET /news/*`
- Generic route: `GET /*`
- JSON generation route: `POST /generate`
- Shared renderer package: `packages/og-image-core`

## Working Workflow (for Claude)

1. Run `git status --short` before editing.
2. Focus on one workspace at a time.
3. Run minimal validation for touched workspace.
4. Summarize changes with file paths.

## Legacy Docs

Treat the following as reference archives, not implementation source of truth:

- `/_docs/articles/*`
- `/TODO`
- `/services/trailbase/traildepot/PROMPT.md`

