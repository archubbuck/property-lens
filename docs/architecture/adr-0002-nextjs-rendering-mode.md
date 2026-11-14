# ADR 0002: Next.js rendering mode and framework version

**Status:** Accepted

## Context

`create-next-app@latest` at the time of this build scaffolded **Next.js
16.4.6**, which is a genuinely current stable release (not a typo/hallucinated
version). Two Next.js 16 changes materially affect this build:

1. **Cache Components** (Partial Prerendering-by-default caching paradigm)
   is enabled by default for new projects.
2. **Middleware was renamed to Proxy** (`src/proxy.ts` instead of
   `src/middleware.ts`), with identical capabilities.

## Decision

- **Cache Components: disabled** (`cacheComponents: false` in
  `next.config.ts`). PropertyLens is overwhelmingly a dynamic, per-user,
  auth-gated application (research runs, saved properties, usage, billing,
  support tickets all require a live session and live data). Opting into the
  new caching model would require annotating nearly every route with `"use
  cache"`/`"use client"` boundaries for little benefit at this stage, and
  would materially increase risk across a large, parallelized build. This
  can be revisited once the core product is stable and specific pages are
  identified as good candidates for static/ISR-style caching (e.g. the Help
  & Support content, which is genuinely mostly-static).
- **Proxy convention adopted** for route-guarding (`src/proxy.ts`), per the
  framework's new naming. It performs an optimistic, cookie-presence-only
  check and explicitly defers authoritative verification to each
  server component/route handler via `src/server/auth/session.ts`.

## Consequences

Future contributors should not reintroduce `middleware.ts` — use
`proxy.ts`. If Cache Components are enabled later, every server component
reading request-time data (cookies, headers, Prisma queries keyed by the
current user) must be audited for correct caching directives first.
