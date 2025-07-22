# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

645.live is a Korean lottery (로또 645) statistics and analysis web application built with SvelteKit, TrailBase, and deployed on Cloudflare Pages. It provides real-time lottery draw monitoring, historical analysis, and statistical insights.

## Technology Stack

- **Frontend**: SvelteKit 2.21+ with Svelte 5, TypeScript 5.8+
- **Backend**: TrailBase 0.7+ for real-time data, PostgreSQL 17 via Docker
- **Database**: Drizzle ORM 0.44+ with connection pooling via Cloudflare Hyperdrive
- **Styling**: TailwindCSS 4.1+ with DaisyUI 5.0+ components
- **Deployment**: Cloudflare Pages with Workers
- **Package Manager**: Bun (not npm)
- **Linting/Formatting**: Biome 1.9.4 (not ESLint/Prettier)

## Development Commands

### Main Application (pages/www/)

```bash
# Development server
bun run www dev

# Production build
bun run www build

# Deploy to Cloudflare Pages
bun run www deploy

# Preview locally with Wrangler
bun run www preview

# Type checking
bun run www check

# Watch mode type checking
bun run www check:watch
```

### Database Commands

```bash
# Start PostgreSQL via Docker Compose
bun run www db:start

# Push schema changes to database
bun run www db:push

# Generate migrations
bun run www db:generate

# Run migrations in production
bun run www db:migrate

# Open local Drizzle Studio
bun run www db:studio

# Open remote Drizzle Studio
bun run www db:studio:remote
```

### TrailBase Backend

```bash
# Start TrailBase service via Docker
bun run trail
```

### Code Quality

```bash
# Format and lint code (uses Biome)
bun run format

# Lint only
bun run lint
```

### Cloudflare Integration

```bash
# Generate Cloudflare Worker types
bun run www cf-typegen

# View deployment logs
bun run www tail
```

## Architecture Overview

### Monorepo Structure

- `pages/www/` - Main SvelteKit application
- `workers/og-645-live/` - Cloudflare Worker for OG image generation  
- `services/trailbase/` - TrailBase backend service with Docker setup

### Key Architectural Patterns

#### Real-time Data Flow

- TrailBase client (`src/lib/trailbase/client.ts`) provides singleton WebSocket connection
- Uses reactive Svelte 5 runes for state management
- Auto-reconnection with exponential backoff
- Connection state tracking with comprehensive error handling

#### Component Organization

- `src/lib/components/stats/` - Statistics visualization components
- `src/lib/modules/lotto/` - Lotto-specific components and types  
- `src/lib/ui/` - Reusable UI components
- `src/lib/layout/` - Header, Footer, page transitions

#### Data Layer

- Dual database architecture: TrailBase for real-time + Drizzle/PostgreSQL for persistence
- Database schema in `src/lib/db/schema/`
- TrailBase client abstraction with safe initialization patterns

### Code Conventions

#### ⚠️ **CRITICAL: Svelte 5 Syntax Requirements**

**HIGHEST PRIORITY - Always use Svelte 5 runes syntax:**

- ❌ `let variable = value;` → ✅ `let variable = $state(value);`
- ❌ `export let prop;` → ✅ `let { prop } = $props();`
- ❌ `$: derived = expression;` → ✅ `let derived = $derived(expression);`
- ❌ `$: { /* effect */ }` → ✅ `$effect(() => { /* effect */ });`
- ❌ Legacy reactive statements → ✅ Runes-based reactivity
- Always use `$state`, `$derived`, `$effect`, `$props` instead of legacy syntax
- Never mix legacy Svelte syntax with runes in the same component

#### Biome Configuration

- Uses tabs for indentation (not spaces)
- Double quotes for strings
- Trailing commas enabled
- Svelte-specific rule overrides for `useConst` and `useImportType`

#### Import Patterns

- Always use individual component imports, not barrel exports
- TypeScript imports with proper type-only imports where applicable
- SvelteKit imports use `$app/` and `$env/` aliases

#### TrailBase Integration

- Always use `trailbaseClient.ensureInitialized()` before API calls
- Handle 404s gracefully - they're expected for missing lottery data
- Use proper cleanup patterns for subscriptions
- Connection state should be reactive using Svelte stores/runes

### Environment Variables

- `PUBLIC_TRAILBASE_URL` - TrailBase backend URL (defaults to localhost:4000)
- Environment variables in `.env` files are loaded automatically

### Testing

- Uses Playwright for E2E testing (check package.json for specific commands)
- No unit test framework currently configured

### Deployment Notes

- Builds target Cloudflare Pages with Workers adapter
- Database connections use Cloudflare Hyperdrive for connection pooling
- OG image generation handled by separate Cloudflare Worker
- All Korean language content (lang="ko")
