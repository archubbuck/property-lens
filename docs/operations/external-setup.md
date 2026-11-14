# External setup required before production use

This build is fully functional end-to-end using **fixture/demo data and a
dev-mode identity shim**, because the following external, credentialed
services cannot be provisioned by an autonomous coding agent. Each item
below lists exactly what a human operator must do, and the code seam that
will activate automatically once it's done.

## 1. Identity: Clerk

- **What's needed:** A Clerk application, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  and `CLERK_SECRET_KEY`, and a configured webhook endpoint for
  `user.created`/`user.updated`/`user.deleted`.
- **Why it's blocked:** Requires a real Clerk account and dashboard
  configuration (OAuth app registrations for Google/Apple/Microsoft, email
  templates, etc.) that cannot be created programmatically without
  credentials.
- **Activation seam:** `src/server/auth/session.ts` — `isClerkConfigured()`
  automatically switches `getSessionUserId()` from the dev-session cookie to
  real `@clerk/nextjs/server` `auth()` the moment both env vars are set. No
  other call site needs to change. Wire a webhook route calling
  `ensureUserProvisioned()` (`src/server/domains/users/provisioning.ts`) for
  `user.created`.
- **Until then:** `/sign-in` and `/sign-up` run a clearly-labeled
  development-mode form (any email, no password check) via
  `/api/v1/dev-auth/*`.

## 2. Billing provider

- **What's needed:** A decision between Clerk Billing and a dedicated
  provider (e.g. Stripe), per SPECIFICATION.md section 18's open item, plus
  the corresponding account, product/price objects, and webhook secret.
- **Why it's blocked:** No billing account/credentials exist in this
  environment; the spec explicitly says not to assume the mockup-shown
  prices ($19/$39/$99) are approved.
- **Activation seam:** `src/server/domains/billing/plans.ts` (`PLAN_CATALOG`)
  is the single source of plan pricing/features, seeded into the `Plan`
  table — update it and re-seed once real pricing is approved.
  `/billing` currently performs local plan changes (minting a new
  `EntitlementPeriod`/`Subscription` row directly) as an explicit stand-in
  for a real checkout + webhook flow; replace with real checkout session
  creation + webhook handling once a provider is chosen.

## 3. Durable workflow engine (Inngest or Trigger.dev)

- **What's needed:** An account + API key for whichever engine is chosen
  (spec section 18 leaves this open).
- **Why it's blocked:** No account/credentials exist here.
- **Until then:** Research-run orchestration should run as an in-process
  state machine with the same stage/event shape the real engine would
  produce, so swapping in a durable engine later is a scheduler change, not
  a data-model change.

## 4. AI provider (Vercel AI SDK model)

- **What's needed:** An API key for the chosen model provider.
- **Why it's blocked:** No credentials exist here, and SPECIFICATION.md is
  explicit that AI must never fabricate facts presented as verified data.
- **Until then:** The demo/sample property report is **hand-curated fixture
  data**, not AI-generated, and is clearly flagged `isDemoSample: true` in
  the database. No other property can currently be looked up end-to-end
  without this key and without a licensed source-data/government-API
  integration (see #5).

## 5. Government/public data source integrations

- **What's needed:** Per-jurisdiction legal/licensing review and API
  access for county assessor/recorder systems, FEMA NFHL, USFWS NWI, USGS
  3DEP, USDA SSURGO, EPA ECHO/Envirofacts, etc. (SPECIFICATION.md section
  7.2), plus a chosen pilot jurisdiction.
- **Why it's blocked:** Requires legal/compliance review and, in some
  cases, paid or rate-limited API agreements that cannot be entered into
  autonomously.
- **Until then:** `PublicDataSource` rows exist as a registry/fixture for
  the demo property only; no live scraping/API calls are made.

## 6. Observability

- **What's needed:** A Langfuse (or equivalent) project + API key for AI
  cost/trace observability.
- **Until then:** `ModelInvocation`/`CostLedgerEntry` tables exist and are
  ready to be populated once a real AI provider is wired up.

## 7. Object storage / deployment

- **What's needed:** A Vercel project (or equivalent host) and an object
  storage bucket for evidence documents/attachments if those grow beyond
  inline storage.
