# ADR 0003: Prisma version pin

**Status:** Accepted

## Context

At the time of this build, npm's `prisma`/`@prisma/client` `latest` dist-tag
resolved to `8.0.0-rc.33` — a pre-release that removes `datasource.url`
support from `schema.prisma` in favor of a new `prisma.config.ts` +
driver-adapter workflow, and replaces `prisma migrate dev` with a new
`contract emit` / `migration plan` CLI. Prisma `7.10.1` (also currently
available) carries the same breaking adapter requirement.

## Decision

Pinned `prisma` and `@prisma/client` to the last stable 6.x release,
**6.19.3** (exact version, not a caret range), using the familiar
`datasource db { provider = "postgresql"; url = env("DATABASE_URL") }` +
`prisma migrate dev` / `prisma generate` workflow throughout this repo.

## Consequences

- Do not run `npm update prisma @prisma/client` without deliberately
  re-evaluating this decision — it will pull in a release-candidate or a
  release that requires a config/workflow rewrite.
- All contributors and automated agents working on this codebase must use
  the Prisma 6.x CLI surface (`prisma migrate dev --name <name>`, `prisma
  generate`, `prisma studio`), not 7.x/8.x adapter-based commands.
- Revisit this pin once Prisma 7/8 reaches a stable release the team has
  deliberately migrated to, updating `prisma/schema.prisma` and
  `prisma.config.ts` together in a single tracked change.
