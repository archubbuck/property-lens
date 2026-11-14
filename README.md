# PropertyLens

A property due-diligence research application: look up a U.S. property and
get an evidence-backed report covering ownership, assessment & taxes,
zoning & use, market insights, and history — built from SPECIFICATION.md.

## Status

This build is a **functional, honestly-labeled foundation**, not a finished
production product. It runs a real Next.js + Postgres + Prisma stack with a
complete UI matching the provided mockups, backed by **one curated demo
property** (12814 Willow Creek Dr, Fulshear, TX) with real, structured,
evidence-cited data. Arbitrary real-world address lookups are intentionally
*not* fabricated — see [`docs/operations/external-setup.md`](docs/operations/external-setup.md)
for exactly what's required (Clerk, a billing provider, an AI provider,
licensed government data access) before this can serve real lookups, and
[`docs/architecture/`](docs/architecture) for the key design decisions (ADRs)
made while building it.

## Tech stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- Postgres 16 (local via Docker Compose) + Prisma ORM **6.19.3** (pinned —
  see [ADR 0003](docs/architecture/adr-0003-prisma-version-pin.md))
- Zod for all contracts/validation; RFC 9457 Problem Details for API errors
- Clerk-ready auth abstraction that runs on a signed dev-session cookie
  until real Clerk keys are supplied (see
  [`src/server/auth/session.ts`](src/server/auth/session.ts))

## Getting started

```bash
cp .env.example .env.local   # already done in this repo; review values
docker compose up -d         # starts local Postgres
npm install
npx prisma migrate dev       # applies the schema (already applied once)
npm run db:seed              # seeds plans, help content, and the demo property
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/research`. Sign up with
any name/email (no password is checked in dev-auth mode) to try the full
authenticated flow, or try the sample property directly.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (includes type checking) |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run db:seed` | Seed plans/help content/demo property |

## Repository layout

See `src/` for `app/` (routes), `components/` (UI + feature components),
`server/` (domains, infrastructure, auth, integrations), `contracts/`
(shared zod schemas + API error helpers). See `docs/` for architecture
decisions and operational/external-setup notes, and `mockups/` for the
visual reference this UI was built against.
