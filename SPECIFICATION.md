# PropertyLens — Autonomous Implementation Specification

**Version:** 1.0  
**Status:** Build-ready engineering specification  
**Product:** PropertyLens — evidence-backed property due diligence  
**Audience:** Autonomous engineering agents, technical reviewers, and product owners  
**Last updated:** 2026-11-13

> **Mission:** Build a production-ready, responsive property-research web application that turns a U.S. address into a transparent, source-cited investment due-diligence report using freely accessible public data, deterministic retrieval, and selectively metered AI interpretation.

> **Important:** Screenshots and sample property facts in mockups are *illustrative*, not verified records. Never hardcode fictional values as real property intelligence. This document is the functional contract; visual mockups are design references, subject to accessibility, evidence, and feasibility requirements.

---

## 0. Operating instructions for the implementing agent

### 0.1 Mandatory session-start discovery

Before planning, editing, executing commands, or installing dependencies, inspect the repository for existing capabilities and instructions. This step is mandatory at the beginning of **every** agent session, including resumed sessions:

1. Read `AGENTS.md`, `.github/copilot-instructions.md`, applicable nested `AGENTS.md`, README, package manifests, lockfiles, and repository conventions.
2. Enumerate existing agent behaviors, skills, workflows, prompts, scripts, tools, tests, CI jobs, MCP configurations, and documentation. Check `.agents/`, `.github/`, `scripts/`, `docs/`, and other convention-based directories if present.
3. Read architecture decisions, existing contracts, design tokens, and recent implementation status.
4. Identify reusable functionality; prefer it over duplicating or replacing it.
5. Inspect Git status, branch, remotes, and existing code. Do not overwrite user changes.
6. Produce a short capability inventory and task-to-capability mapping in the session work log before proceeding.
7. Discover available MCP integrations, verify permissions, and use them only when they improve reliability or efficiency.
8. If this is a new repository, scaffold these conventions first and document the discovery process for future sessions.

### 0.2 Agent execution policy

- Execute phases in dependency order; do not implement placeholder-only features and call them complete.
- Prefer deterministic scripts, APIs, fixtures, schema validation, and reproducible tests over speculative agent actions.
- Maintain a task ledger at `docs/implementation/progress.md` with phase, tasks, evidence, blockers, and next steps.
- Use small, reviewable Git commits. Never commit secrets or production data.
- Separate presentation components from data access through typed feature facades/hooks.
- When a public data source is unavailable, preserve explicit uncertainty rather than fabricating a result.
- If external credentials or account setup are required, complete all code and mock tests first; document the precise human action and verification needed. Never claim external setup was completed without confirmation.
- Do not autonomously purchase services, activate paid resources, or change production billing.
- Any AI-generated code must pass the same checks as manually authored code.

### 0.3 Definition of done

A feature is complete only when: its UI is functional; backend/API is implemented; authorization and validation are enforced; loading/empty/error states exist; automated tests pass; observability is present; and documentation is updated. Production readiness additionally requires deployment, real integration tests, accessibility, security, and operational verification.

---

## 1. Product scope and user journeys

### 1.1 Primary user journeys

1. Visitor lands on Research and can view a curated sample report without using credits.
2. Visitor registers/signs in with Clerk and receives five **lifetime** free research lookups.
3. Signed-in user enters an address; system resolves address and parcel without charging.
4. User confirms ambiguous parcel selection, sees lookup entitlement, and starts research.
5. System reserves a lookup atomically, performs durable cold-start research, streams real stage progress, and produces a persisted report.
6. User browses Overview, Ownership, Assessment & Taxes, Zoning & Use, Market Insights, and History tabs, including provenance and unknowns.
7. User saves a property, reopens the existing report without charge, optionally refreshes research with explicit credit confirmation, and compares properties.
8. User views usage, subscription, invoices, saved-property activity, help topics/articles, and support tickets.
9. User manages account identity, security, connected accounts, and application notification preferences.
10. Administrators inspect research execution, source health, model tokens, costs, and quality.

### 1.2 Plans and entitlements

| Tier | Lookup allowance | Reset policy | Notes |
|---|---:|---|---|
| Free | 5 | Lifetime, never replenishes | One-time entitlement per eligible account; abuse controls required |
| Explorer | 50 | Monthly billing entitlement period | Price configurable |
| Investor | 150 | Monthly billing entitlement period | Price configurable |
| Professional | Unlimited | Subject to fair-use, concurrency, and anti-abuse safeguards | Price configurable |

**Do not assume earlier illustrative $19/$39/$99 prices are approved.** Store plan identifiers, pricing, currency, billing interval, and entitlements in versioned configuration synchronized with the billing provider. Define whether credits roll over (default: no) and document upgrade/downgrade/proration behavior. Paid tier names are configurable.

### 1.3 Non-goals for initial release

- Legal opinion, title insurance, certified appraisal, guaranteed investment return, insurance quote, or confirmation of buildability.
- Nationwide coverage guarantees for parcel GIS, permits, sale prices, zoning, or deed copies.
- Paid data subscriptions or paid per-record purchases.
- Fully autonomous continuous monitoring of every saved property from day one.
- Native mobile apps; the responsive web app is the product.

---

## 2. Architecture and technology decisions

| Layer | Preferred implementation | Constraints |
|---|---|---|
| Web | Next.js App Router + React + TypeScript strict mode | URL-addressable views; client-side transitions |
| Styling | Tailwind CSS v4 + semantic CSS tokens | Light/dark support; light default |
| Identity | Clerk | Never store passwords; provider-managed MFA/social login |
| Billing | Clerk Billing if currently suitable | Verify API/portal/webhooks/plan limits; use adapter for substitution |
| API | Next.js route handlers, REST `/api/v1` | OpenAPI 3.1; Zod runtime validation |
| Persistence | PostgreSQL + Prisma | Transactions, indexes, migration discipline |
| Research jobs | Durable orchestrator: Inngest or Trigger.dev | Choose one after documented evaluation; no request-bound long jobs |
| AI | Vercel AI SDK | Structured output, versioned prompts, usage accounting |
| Tracing | Langfuse or equivalent | Verify deployment/privacy/cost; DB ledger remains authoritative |
| Geospatial | PostGIS where supported, otherwise GIS-capable service | Geometry transformations and spatial tests |
| Object storage | Private S3-compatible/Vercel Blob equivalent | Evidence snapshots and secure attachments |
| CI/CD | GitHub Actions + Vercel | Isolated preview/development and production environments |
| Testing | Vitest, Playwright, API contract tests, accessibility checks | Deterministic fixtures and integration coverage |

Keep domain boundaries explicit: `identity`, `billing`, `usage`, `properties`, `sources`, `research`, `evidence`, `reports`, `saved`, `activity`, `notifications`, `support`, `admin`.

### 2.1 Environment strategy

- **Local:** isolated developer DB, local mock providers, Clerk test keys, deterministic fixtures.
- **Development/Preview:** non-production Vercel environment and DB, separate Clerk test instance, billing sandbox, isolated storage and workflow keys; preview deployments per PR.
- **Production:** dedicated Vercel production deployment, production DB/storage, Clerk live instance, live billing, independent secrets and workflow credentials.
- Apply least privilege; never let Preview or CI access production data or credentials.
- Store secrets in Vercel environment variables or integrated secret management. Maintain `.env.example` with names and descriptions only.
- Define migration promotion, backups, restore tests, rollback, and incident procedures.

### 2.2 Repository layout

```text
src/
  app/
    (public)/
    (authenticated)/
    api/v1/
  features/
    research/ saved-properties/ usage/ billing/ account/ help/ support/
  components/
    ui/ layout/ charts/ maps/
  contracts/
    schemas/ openapi/
  server/
    domains/
    integrations/
      public-data/ clerk/ billing/ ai/
    infrastructure/
      database/ jobs/ cache/ storage/ telemetry/
  styles/
prisma/
  schema.prisma
  migrations/
docs/
  architecture/ design/ api/ research/ implementation/ operations/
scripts/
tests/
  unit/ integration/ contract/ e2e/ fixtures/
.github/workflows/
AGENTS.md
```

---

## 3. Design system and anti-slop standard

### 3.1 Brand tokens — Tailwind CSS v4

Define semantic CSS custom properties in `src/app/globals.css` (or the repo's equivalent) and expose them with `@theme inline`. Use these base light tokens:

```css
@import "tailwindcss";
:root {
  color-scheme: light;
  --background: #f8f7f3;
  --foreground: #202923;
  --card: #ffffff;
  --card-foreground: #202923;
  --primary: #315b49;
  --primary-foreground: #ffffff;
  --primary-hover: #254737;
  --secondary: #edf0eb;
  --secondary-foreground: #294c3d;
  --muted: #f0f1ec;
  --muted-foreground: #59655d;
  --accent: #f2e8d8;
  --accent-foreground: #4e3c25;
  --border: #dce0d8;
  --input: #cbd2c8;
  --ring: #315b49;
  --risk-critical: #a43f3f;
  --risk-high: #a34b2d;
  --risk-moderate: #90601d;
  --risk-low: #315b49;
  --info: #416a85;
  --sand: #d9b985;
  --chart-1: #315b49;
  --chart-2: #416a85;
  --chart-3: #b76e32;
  --chart-4: #8d789d;
  --chart-5: #7a8872;
}
.dark {
  color-scheme: dark;
  --background: #151c18;
  --foreground: #edf0eb;
  --card: #202923;
  --card-foreground: #edf0eb;
  --primary: #a4c8b2;
  --primary-foreground: #17271e;
  --primary-hover: #c0dcc9;
  --secondary: #2c3931;
  --secondary-foreground: #e1eae2;
  --muted: #29332c;
  --muted-foreground: #b0bcb2;
  --accent: #403729;
  --accent-foreground: #f1ddbc;
  --border: #3c493f;
  --input: #536357;
  --ring: #a4c8b2;
  --risk-critical: #f1a4a0;
  --risk-high: #e8a487;
  --risk-moderate: #e8c57f;
  --risk-low: #a4c8b2;
  --info: #a3c6df;
  --sand: #d9b985;
  --chart-1: #a4c8b2;
  --chart-2: #a3c6df;
  --chart-3: #e8a487;
  --chart-4: #c2acd3;
  --chart-5: #bac8a8;
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-risk-critical: var(--risk-critical);
  --color-risk-high: var(--risk-high);
  --color-risk-moderate: var(--risk-moderate);
  --color-risk-low: var(--risk-low);
  --color-info: var(--info);
  --color-sand: var(--sand);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}
```

Add accessible semantic foreground/surface tokens for each risk level, preserving the agreed v1 palette. Test contrast in both themes. Use `font` tokens for a restrained editorial serif heading and highly legible sans body; select and license actual fonts before implementation.

### 3.2 Visual design rules

- Quiet editorial visual hierarchy: restrained ivory/white surfaces, forest-green actions, typographic structure, meaningful density.
- Avoid purple/blue glowing gradients, aurora effects, glassmorphism, excessive pill CTAs, nested card stacks, decorative grids, fake dashboards, arbitrary three-feature-card sections, and sparkles-as-AI branding.
- Do not use generic SaaS slogans, fabricated statistics, fake testimonials, or decorative charts.
- Prefer left-aligned task-focused copy; use icons only when they improve comprehension.
- No hardcoded colors in components; use semantic tokens. Exceptions require documented approval.
- Motion should convey state, respect reduced-motion preferences, and never obstruct research.
- Display source and verification information near consequential findings; risk colors must never be the only signal.
- Target WCAG 2.2 AA; verify keyboard, focus, labels, error descriptions, contrast, and responsive behavior.
- Capture and review Playwright screenshots at 375, 768, and 1440px in both themes.
- Audit actual rendered pages, not source code alone; subjective anti-slop reviews require human confirmation before blocking.

### 3.3 Mockup fidelity

Use the previously created PropertyLens mockup archive as visual references **if supplied in the agent workspace**. Do not assume screenshots are present or invent their filenames. Inventory available images, map them to page routes, and note inconsistencies. Never use screenshot-only fictional data as authoritative API fixture data without a conspicuous demo label.

---

## 4. Pages, routes, and behavior contracts

The application should feel like a seamless single-page experience but use URL-addressable Next.js routes with client navigation and browser history.

| Route | Screen | Required behavior |
|---|---|---|
| `/` or `/research` | Research landing | Address input, validation, curated random sample, recent report if signed in |
| `/research/runs/[runId]` | Research in progress | Real stage events, elapsed time, retry/cancel, navigate away safely |
| `/properties/[id]` | Report Overview | Hero, parcel facts, risk summary, location, source coverage, next steps |
| `/properties/[id]?tab=ownership` | Ownership | Owner if lawfully available, deed history, related records, unknowns |
| `?tab=assessment` | Assessment & Taxes | Assessments, taxing entities, bills, historical trends, source links |
| `?tab=zoning` | Zoning & Use | District, permitted/conditional uses, ordinance sections, limitations |
| `?tab=market` | Market Insights | Public comps and trends where supported, missing-data disclosures |
| `?tab=history` | History | Event timeline, source-linked transactions, permits, zoning changes |
| `/saved` | Saved Properties | Search, filter, sort, unsave, view report, refresh with confirmation |
| `/saved/activity` | All Activity | Filter by property, category, date; pagination; event details |
| `/saved/compare` | Comparison | Compare selected saved reports with date and evidence qualifiers |
| `/usage` | Usage | Allowance, ledger, resets, consumption, plan CTA |
| `/billing` | Billing | Plan, checkout, manage subscription, invoices where supported |
| `/help` | Help & Support | Search, browse by topic, contact options |
| `/help/topics/[slug]` | Help topic | Article index, descriptions, breadcrumbs |
| `/help/articles/[slug]` | Help article | Structured content, related articles, breadcrumbs |
| `/support/new` | Send a Message | Authenticated ticket form, validation, attachments if enabled |
| `/support/tickets/[id]` | Ticket | Own ticket status, thread, replies where implemented |
| `/sign-in` | Login | Clerk-managed authentication with custom visual shell |
| `/sign-up` | Register | Clerk-managed registration with custom visual shell |

**Avatar dropdown:** show account identity, plan/remaining lookups, Manage Account, Manage Subscription, Help & Support, Sign Out. Use Clerk-supported account/security/connected-account components and app-owned notification preferences. Account modal tabs: Profile, Security, Email & Notifications, Connected Accounts. If Clerk's SDK cannot support a requested custom tab directly, embed the supported provider UI or navigate to an account screen; do not invent insecure account-management APIs.

**Save behavior:** saving and reopening a completed report cost zero credits. A deliberate new research run can cost one credit. Unsave does not delete historical reports. Comparison must identify report timestamps and coverage differences.

**Random address:** use a curated, pre-researched demonstration property. Anonymous sample viewing is free and must not trigger arbitrary research or consume credits.

**Activity:** only show events that actually exist. Automatic value-change or zoning-change alerts require scheduled refresh infrastructure; do not present them as live until enabled.

**Images:** use lawfully sourced images with attribution and rights metadata; when unavailable show a deliberate map/parcel placeholder, never a synthetic photo presented as the real property.

---

## 5. API specification and contracts

### 5.1 Standards

- REST prefix `/api/v1`; OpenAPI 3.1 is the source of truth.
- Define Zod schemas and generated typed clients; avoid duplicate handwritten DTOs.
- Authenticated endpoints use Clerk server-side identity and per-resource ownership checks.
- Use cursor pagination for feeds, history, documents, tickets, and saved properties.
- Mutations are validated, rate-limited, audited, and idempotent where appropriate.
- Use RFC 9457 Problem Details for errors, including stable codes and request ID.
- Provide `schemaVersion`, timestamps, pagination metadata, and explicit missing-data states.
- Cache GET responses only when data classification, licensing, and authorization permit.
- Never expose internal source credentials, model prompts containing secrets, or private data in public responses.

### 5.2 Endpoint inventory

| Method | `/api/v1` path | Purpose |
|---|---|---|
| GET | `/properties/resolve?address=` | Address normalization and parcel candidates |
| GET | `/properties/random` | Curated demo property |
| GET | `/properties/{id}` | Canonical summary |
| GET | `/properties/{id}/overview` | Overview projection |
| GET | `/properties/{id}/ownership` | Ownership projection |
| GET | `/properties/{id}/assessments` | Taxes and assessments |
| GET | `/properties/{id}/zoning` | Zoning and use |
| GET | `/properties/{id}/market` | Market evidence |
| GET | `/properties/{id}/history` | Timeline |
| GET | `/properties/{id}/map` | Geometry and map metadata |
| GET | `/properties/{id}/media` | Licensed images |
| GET | `/properties/{id}/evidence` | Evidence with provenance |
| GET | `/properties/{id}/documents` | Public documents |
| GET | `/properties/{id}/comparables` | Public comparables |
| GET | `/properties/{id}/reports` | Historical report snapshots |
| POST | `/research/runs` | Create research run, reserve credit |
| GET | `/research/runs/{id}` | Status and progress |
| GET | `/research/runs/{id}/events` | Authenticated SSE stream, replay cursor |
| GET | `/research/runs/{id}/report` | Immutable report/partial report |
| GET | `/research/runs/{id}/evidence` | Run-specific evidence |
| GET | `/research/runs/{id}/coverage` | Coverage and confidence |
| POST | `/research/runs/{id}/cancel` | Request cancellation |
| GET | `/me` | User profile |
| GET/PATCH | `/me/preferences` | App preferences |
| GET/PATCH | `/me/notifications/preferences` | Notification choices |
| GET | `/me/notifications` | Notifications |
| PATCH | `/me/notifications/{id}` | Mark read |
| GET | `/me/saved-properties` | Filtered saved list |
| POST | `/me/saved-properties` | Save property |
| PATCH/DELETE | `/me/saved-properties/{propertyId}` | Notes, labels, unsave |
| GET | `/me/saved-properties/changes` | Detected changes |
| GET | `/me/activity` | Activity feed |
| GET | `/me/activity/summary` | Event aggregates |
| GET | `/me/activity/{id}` | Event details |
| POST | `/property-comparisons` | Compare report snapshots |
| GET | `/plans` | Public plan catalog |
| GET | `/me/subscription` | Entitlements and billing state |
| GET | `/me/usage` | Available allowance |
| GET | `/me/usage/history` | Ledger |
| GET | `/me/usage/summary` | Usage trends |
| POST | `/me/subscription/checkout` | Checkout adapter |
| POST | `/me/subscription/portal` | Provider management flow |
| GET | `/me/invoices` | Invoices when supported |
| GET | `/help/topics` | Help topics |
| GET | `/help/topics/{slug}` | Topic articles |
| GET | `/help/articles/{slug}` | Article |
| GET | `/help/search?q=` | Search help |
| POST | `/support/tickets` | Create ticket |
| GET | `/support/tickets` | User's tickets |
| GET | `/support/tickets/{id}` | Ticket details |
| POST | `/support/attachments` | Private upload initiation |
| GET | `/system/status` | Public operational status |
| POST | `/webhooks/clerk` | Verified identity events |
| POST | `/webhooks/billing` | Verified subscription events |
| GET | `/admin/research/runs` | Admin runs |
| GET | `/admin/research/runs/{id}/costs` | Per-run cost |
| GET | `/admin/analytics/usage` | Usage analytics |
| GET | `/admin/analytics/costs` | Cost analytics |
| GET | `/admin/analytics/margins` | Unit economics |
| GET | `/admin/data-sources` | Connector health |
| GET | `/admin/research/quality` | Evaluations |

### 5.3 Essential schemas

```typescript
type Verification = 'verified' | 'corroborated' | 'unverified' | 'conflicting';
type CoverageStatus = 'verified' | 'partial' | 'unavailable' | 'not_applicable';
type RunStatus = 'queued' | 'resolving' | 'retrieving' | 'analyzing' |
  'assembling' | 'completed' | 'partial' | 'failed' | 'cancel_requested' | 'cancelled';

type EvidenceFact<T> = {
  id: string;
  propertyId: string;
  field: string;
  value: T;
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  effectiveDate?: string;
  verification: Verification;
  confidence?: number; // Only if calibrated/documented; otherwise omit
  evidenceReference?: string;
  caveats: string[];
};

type ResearchFinding = {
  id: string;
  domain: string;
  title: string;
  explanation: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'unknown';
  verification: Verification;
  evidenceIds: string[];
  investmentImplication?: string;
  recommendedAction?: string;
};

type ResearchRunRequest = {
  propertyId: string;
  idempotencyKey: string;
  researchProfile?: 'standard' | 'land' | 'residential' | 'commercial';
  confirmCreditUse: true;
};
```

Define all remaining request/response schemas in `src/contracts`, publish generated OpenAPI documentation, and test schema compatibility.

### 5.4 API acceptance tests

- Anonymous requests cannot access private saved properties, research runs, usage, or tickets.
- User A cannot retrieve User B's run, report (unless explicitly public demo), invoice, ticket, or bookmark.
- Invalid IDs and malformed payloads produce stable 4xx responses.
- Repeated research POST with the same user/key returns the same run and never charges twice.
- GET projections agree with the same immutable report snapshot.
- Stream reconnect replays missed events without duplicates.
- Filtering and pagination remain deterministic under concurrent writes.

---

## 6. Database design and invariants

### 6.1 Minimum entities

- `User` (Clerk ID, status, createdAt, locale; no passwords)
- `Plan`, `Subscription`, `EntitlementPeriod`
- `UsageLedgerEntry`, `CreditReservation` (append-only usage accounting)
- `Property`, `PropertyAddress`, `Parcel`, `ParcelPropertyLink`, `Jurisdiction`
- `PublicDataSource`, `SourceCoverage`, `SourceEndpoint`, `SourceLicense`, `SourceHealth`
- `EvidenceDocument`, `EvidenceFact`, `EvidenceRelation`, `EvidenceSnapshot`
- `ResearchRun`, `ResearchStage`, `ResearchEvent`, `ResearchReport`, `ResearchFinding`, `CoverageAssessment`
- `ModelInvocation`, `ExternalRequestCost`, `CostLedgerEntry`
- `SavedProperty`, `SavedPropertyNote`, `ActivityEvent`, `PropertyChange`
- `HelpTopic`, `HelpArticle`, `SupportTicket`, `SupportMessage`, `SupportAttachment`
- `NotificationPreference`, `Notification`, `WebhookEvent`, `AuditLog`

### 6.2 Key invariants

1. Property identity is not just a street address. Support multiple parcels per property and multiple addresses/aliases per parcel.
2. A report snapshot is immutable and references the exact evidence, prompt versions, and model outputs used.
3. Source metadata includes jurisdiction, effective date, retrieved date, license, caching rights, and provenance.
4. Saved properties are user-owned bookmarks; deletion does not remove research history or violate retention policy.
5. A credit reservation is associated with one user, one idempotent run, and one entitlement period; state transitions are transactional.
6. Usage ledger and cost ledger are append-only; adjustments use compensating entries.
7. Activity records are derived from actual events, never invented UI data.
8. Webhook processing is idempotent, signature-verified, and robust to out-of-order delivery.
9. Database constraints and indexes enforce uniqueness, tenant isolation, and high-frequency query performance.
10. PII retention and deletion policies must respect billing, audit, and legal obligations.

### 6.3 Schema deliverables

Create Prisma models, migrations, seed scripts, ERD, indexes, query plans for critical endpoints, and integration tests against actual PostgreSQL. Where spatial data requires PostGIS, document migration and query strategy explicitly; do not store spatial geometry in a way that makes overlap calculations unreliable.

---

## 7. Free public-data research engine

### 7.1 Policy

Use freely accessible government, academic, and openly licensed sources wherever lawful for commercial operation. No paid data subscriptions or per-record purchases in MVP. Public access **does not automatically authorize commercial redistribution or unrestricted caching**. Maintain a license registry and enforce source-specific attribution, retention, rate limits, and access rules. Never bypass paywalls, CAPTCHA, authentication gates, or robots/terms restrictions.

### 7.2 Candidate sources

| Domain | Candidate authoritative sources | Limitations |
|---|---|---|
| Address | U.S. Census Geocoder | Incomplete rural addresses; match ≠ parcel |
| Jurisdiction | Census TIGER/Line and local boundaries | Boundaries and effective dates vary |
| Parcel | County assessor/GIS, ArcGIS/OGC services | No uniform national public parcel API |
| Ownership/deeds | County assessor/recorder/clerk | Access, privacy, copies, and completeness vary |
| Taxes/assessments | County appraisal district/collector | Assessed ≠ market value |
| Zoning | County/city planning maps and ordinances | District and legal interpretation vary |
| Flood | FEMA NFHL | Map limitations and unmapped areas |
| Wetlands | USFWS NWI | Inventory ≠ legal jurisdiction determination |
| Elevation | USGS 3DEP | Resolution/coverage variations |
| Soil | USDA NRCS SSURGO/Web Soil Survey | Survey gaps; not a site-specific engineering study |
| Wildfire | USFS and state hazard datasets | Hazard classification ≠ insurance quote |
| Environmental | EPA ECHO, Envirofacts, Superfund | Absence of records ≠ absence of contamination |
| Mining | BLM MLRS, USGS, state agencies | Mineral title/abandoned workings may be unresolved |
| Water rights | State water agencies | Creek presence ≠ right to divert/use |
| Broadband | FCC National Broadband Map | Reported coverage ≠ actual service |
| Market | Public recorder, assessor, Census, other lawfully reusable datasets | Sale prices/comps may be unavailable |

### 7.3 Source adapter interface

```typescript
type SourceContext = {
  propertyId: string;
  jurisdictionIds: string[];
  parcelIds: string[];
  geometry?: GeoJSON.Geometry;
};

type SourceResult = {
  sourceId: string;
  facts: EvidenceFact<unknown>[];
  documents: EvidenceDocumentRef[];
  status: 'success' | 'partial' | 'unavailable' | 'error';
  warnings: string[];
};

interface PublicDataConnector {
  id: string;
  supports(context: SourceContext): Promise<boolean>;
  retrieve(context: SourceContext, signal: AbortSignal): Promise<SourceResult>;
}
```

Implement deterministic retry/backoff with jitter, timeout, per-host concurrency limits, caching, circuit breakers, schema validation, and source-specific metrics. Avoid excessive scraping. Verify geometry CRS and units; never assume parcel area from map pixels.

### 7.4 Cold-start algorithm

1. Normalize address; search internal property/address/parcel indexes.
2. Query Census geocoding or another permitted free source if no match.
3. Obtain jurisdiction candidates and spatial coordinates; show ambiguity where applicable.
4. Discover authoritative parcel service from vetted source registry.
5. Spatially query parcels, verify situs address, support multi-parcel listings and uncertain matches.
6. Persist canonical property/parcel identity with provenance.
7. Build research plan based on property type, geography, evidence availability, and cost budget.
8. Launch independent public-source retrieval jobs concurrently; capture all request statuses.
9. Normalize facts, detect conflicting values, and retain competing claims.
10. Retrieve relevant ordinance/document sections, not entire documents unnecessarily.
11. Run limited, structured AI interpretation only for domains needing reasoning.
12. Validate every material AI finding against evidence references.
13. Compute coverage and unresolved risks; generate immutable report projections.
14. Settle/release lookup reservation under explicit policy.
15. Persist events, model usage, costs, and source snapshots; notify user of completion.

### 7.5 Unknown jurisdiction onboarding

Create a separate workflow for unregistered counties: discover official endpoints; inspect GIS service metadata; map field names; test parcel spatial queries; validate sample records and geographic coverage; capture licenses; require approval for ambiguous mappings; register connector with health checks. AI may assist documentation review but may not invent endpoints or silently approve mappings.

### 7.6 Evidence and quality rules

- Distinguish directly observed source facts from derived calculations and AI interpretations.
- Do not infer clear title, unrestricted access, legal water rights, residential buildability, or absence of contamination from missing evidence.
- Verify sales-history events refer to the same parcel set, acreage, and transaction type before comparing prices.
- Calculate percentage changes with explicit denominator and rounding; note non-arm's-length transfers and splits.
- Never present a model-generated estimate as an appraisal.
- Risk labels require evidence and an explainable rubric; unknown is distinct from low risk.
- Include source URLs, publication/effective dates, retrieval dates, and caveats.
- Provide coverage score or category counts only when methodology is documented; avoid arbitrary confidence percentages.

### 7.7 Caching

Cache property facts, jurisdiction rules, and regional hazard layers separately. Record content hashes, versions, source terms, freshness, invalidation policy, and reuse eligibility. Reuse a previous report without charge; new refreshes create new snapshots. Cache invalidation should respond to source changes and elapsed TTL, but TTL is not proof of data freshness.

---

## 8. Durable research orchestration

### 8.1 Stages

`queued → address/parcel resolution → source planning → parallel retrieval → normalization → AI interpretation → verification → report assembly → completed/partial/failed/cancelled`.

Stages may overlap when dependencies permit. Emit stage events with timestamps, task counts, source IDs, warnings, and trace IDs. Display actual progress; do not fabricate a countdown or percentage. Show elapsed time and a time estimate only after calibrated operational measurements.

### 8.2 Reliability requirements

- Durable queue, bounded concurrency, per-stage retry policy, backoff, dead-letter handling, and operator replay.
- Idempotent tasks with checkpoints so retries do not repeat completed paid inference unnecessarily.
- Cancellation is best-effort and does not imply upstream provider calls can always be stopped.
- SSE with reconnection, replay cursor, authorization, and polling fallback.
- Budget enforcement before expensive stages; gracefully return partial reports with explicit gaps.
- Workflow can finish after user closes browser; user sees saved run on return.

### 8.3 Research completion policy

Define a **material completeness threshold** per property type, with required evidence categories and tolerated gaps. If a report cannot meet it, mark `partial` and apply documented credit policy. Default: settle a credit only for a usable completed report; release for early failures; partial cases require explicit product policy and must never silently consume a credit.

---

## 9. AI inference, observability, and cost controls

### 9.1 AI scope

Use AI for ordinance interpretation, unstructured document extraction, evidence reconciliation assistance, risk explanation, and concise report synthesis. Do not use AI for geocoding, straightforward GIS overlay, arithmetic, tax totals, or deterministic source retrieval.

### 9.2 Model invocation ledger

Persist: run ID, stage, user attribution (pseudonymous), model/provider/version, prompt version, provider request ID, input tokens, output tokens, reasoning tokens where provided, cached tokens, actual/estimated cost, pricing version, latency, retry count, success/failure, and source document references. Preserve provider-reported usage; unknown usage is **not** zero.

### 9.3 Cost budget

Per-run configuration should include max AI spend, max provider requests, max tokens, max elapsed time, max external monetary cost, and max concurrency. Check budgets before each expensive action and reconcile actual usage afterward. Add a global emergency kill switch and per-user abuse throttles. Unlimited customer lookups do not mean unlimited model spend or concurrency.

### 9.4 Telemetry and evaluations

- Instrument OpenTelemetry trace IDs across HTTP requests, jobs, connector calls, and AI invocations.
- Use Langfuse if operationally appropriate for prompt versions, traces, model quality, and token dashboards.
- PostgreSQL cost ledger is authoritative for billing economics; tracing backend is not the source of truth.
- Build evaluation fixtures for restrictive zoning, multi-parcel rural acreage, flood overlap, mining claims, ambiguous deeds, missing sales prices, conflicting parcel acreage, and inaccessible records.
- Track citation validity, factual precision, coverage, latency, per-report cost, and hallucination incidents.
- Gate model/prompt changes on evaluation results and regression thresholds.

---

## 10. Lookup-credit accounting and billing

### 10.1 Atomic lifecycle

1. Address entry/resolution is free.
2. User selects property and confirms a chargeable research request.
3. Server verifies subscription entitlement, anti-abuse limits, and idempotency key.
4. Transaction atomically creates run and reserves one credit (or records unlimited-plan authorization).
5. Successful usable report settles the reservation exactly once.
6. Failed pre-result run releases reservation exactly once.
7. Partial reports follow a documented, user-visible policy.
8. Cancellation uses a documented policy depending on whether usable research has already completed.
9. Reopening a report or saving a property is free.
10. Explicit refresh creates a new run and may charge a new credit.

Use unique constraints, transactions, concurrency tests, and append-only ledger adjustments. Define billing-period boundaries and timezone semantics in UTC, deriving entitlements from provider-confirmed subscription events.

### 10.2 Clerk integration

- Use Clerk for sign-in/up, OAuth, session management, MFA, account security, and connected accounts.
- Use verified Clerk webhooks to sync user lifecycle, with idempotency and reconciliation jobs.
- Verify Clerk Billing supports required tiers, subscription management, events, and invoices in the current deployed version. If not, preserve a `BillingProvider` interface and select a supported alternative after approval.
- Do not trust client-supplied plan names, balances, role flags, or payment success.
- Do not store payment card data locally.

### 10.3 Billing acceptance tests

Test 5 free lifetime uses, 50/150 monthly boundaries, unlimited throttling, upgrade/downgrade, failed payment, cancelled subscription, webhook replay, duplicate requests, concurrent starts, period reset, refund/reversal, and report reopen without charge.

---

## 11. Saved properties, comparisons, and activity

### 11.1 Saved-property behavior

- Save/unsave with optimistic UI and server reconciliation.
- Search, filter by type/risk, sort by saved date/researched date/address, cursor pagination.
- Store personal notes and tags; sanitize text.
- View latest accessible report without credit charge.
- Refresh research only after explicit entitlement and charge confirmation.
- Show freshness and evidence completeness; do not claim automatic updates without a monitoring job.

### 11.2 Activity event model

Events: property saved/unsaved, research started/completed/failed, report refreshed, source update observed, tax/assessment change, ownership record change, zoning source change, notification sent. Every event includes actor/system, property ID, event time, evidence/report reference, category, and privacy scope. Dedupe repeated detections.

### 11.3 Monitoring feature flag

For MVP, activity can be driven by user actions and research-run differences. Scheduled monitoring is a later gated feature: implement scheduler, per-source refresh cadence, change diff, notification preference, deduplication, source license checks, and cost limits before advertising it as active.

---

## 12. Support, knowledge base, and notifications

- Seed help topics and articles covering research, public data limitations, usage, billing, saved properties, account/security, and report interpretation.
- Topic landing page lists articles; article page shows actual article content and related links.
- Help search should be deterministic (PostgreSQL full-text search initially), accessible, and handle no results.
- Support form requires category, subject, message, optional property/report reference, consent/privacy notice, and anti-spam controls.
- Store ticket state (`open`, `waiting`, `resolved`, `closed`) and messages; notify user when real delivery is configured.
- Attachments: private signed uploads, file type/size restrictions, scanning, retention, access checks.
- Notification preferences distinguish transactional/security messages from optional product messages; respect unsubscribe rules.
- Do not display a live chat affordance until a real provider is integrated.

---

## 13. Security, privacy, and compliance

- Enforce authorization at every resource read and mutation, not just at route middleware.
- Protect administrative routes with explicit role/permission checks.
- Validate all inputs, sanitize document rendering, apply CSP, protect SSRF-prone fetchers with allowlists and network controls.
- Verify webhook signatures, timestamp tolerances, replay IDs, and provider account scope.
- Implement rate limits per user/IP/source and prevent credit enumeration.
- Use private object storage and short-lived signed access for sensitive documents.
- Classify PII, minimize logs, and document retention/deletion procedures.
- Respect government data licenses, terms, copyright, and public-record privacy restrictions.
- Explain that findings are informational and not legal, appraisal, title, or engineering determinations.
- Provide an incident response runbook, audit logs, backups, and recovery exercises.
- Add dependency scanning, secret scanning, and CI security checks.

---

## 14. MCP server setup and governance

During foundation phase, evaluate and configure MCP integrations **only where they offer measurable benefit**:

| Integration | Use | Guardrail |
|---|---|---|
| GitHub MCP | Issues, PRs, reviews, code context | Scoped repo permissions; branch protection |
| Vercel MCP | Deployments, environment inspection, logs | Separate environments; no secret disclosure |
| PostgreSQL MCP (optional) | Schema inspection and read-only diagnostics | Read-only for agents by default; migrations via code |
| Playwright/browser tooling | Rendered UI checks and visual comparisons | Test environments and non-sensitive data |
| Documentation MCPs | Official SDK/API docs | Verify source/version; not a substitute for tests |
| Public-data GIS adapters | Government GIS APIs | Prefer direct typed HTTP clients unless MCP adds value |

Create `docs/operations/mcp-registry.md` with purpose, permissions, installation instructions, environment scope, test procedure, owner, and fallback. Never require an MCP server to be running for ordinary production research requests unless it is an intentionally deployed production dependency. Never expose admin-capable MCP tools to end users.

---

## 15. Granular implementation plan

Each phase must produce tangible artifacts used by subsequent phases. Mark each step complete only after its acceptance checks pass.

### Phase 0 — Discovery and product baseline

**Inputs:** This specification, existing repo (if any), mockup archive (if provided).

- [ ] P0.01 Execute mandatory session-start discovery.
- [ ] P0.02 Inventory existing code, branches, workflows, scripts, tests, MCPs, and docs.
- [ ] P0.03 Map available mockups to required routes and states.
- [ ] P0.04 Create `docs/implementation/progress.md` and task dependency graph.
- [ ] P0.05 Record open decisions: prices, billing provider capabilities, workflow engine, DB hosting, source licensing, partial-credit policy.
- [ ] P0.06 Define scope, user journeys, MVP gates, and risk register.
- [ ] P0.07 Write ADRs for architecture and operational choices.

**Deliverables:** Capability inventory, route matrix, ADR log, risk register, progress ledger.

**Gate:** No unresolved critical architectural assumptions are silently treated as facts.

### Phase 1 — Repository and environment foundation

- [ ] P1.01 Scaffold or adapt Next.js TypeScript strict project.
- [ ] P1.02 Install Tailwind v4, Prisma, Zod, test and lint tooling.
- [ ] P1.03 Configure Git branches and GitHub branch protections.
- [ ] P1.04 Configure GitHub Actions: lint, typecheck, unit, contract, build, e2e smoke.
- [ ] P1.05 Create `.env.example`, secret naming convention, and environment validation.
- [ ] P1.06 Configure separate local/dev/preview/prod resources and Vercel projects/environments.
- [ ] P1.07 Configure DB migration and rollback process.
- [ ] P1.08 Evaluate and register beneficial MCP servers with least privilege.
- [ ] P1.09 Add logging, request IDs, and error reporting baseline.
- [ ] P1.10 Add README, local setup scripts, and contributor/agent instructions.

**Deliverables:** Deployable empty app, CI pipeline, environment docs, MCP registry.

**Gate:** Clean checkout builds and runs locally; preview deployment uses no production secrets.

### Phase 2 — Design system and application shell

- [ ] P2.01 Implement semantic Tailwind palette and dark theme.
- [ ] P2.02 Establish typography, spacing, radius, elevation, focus, and chart tokens.
- [ ] P2.03 Build reusable Button, Input, Select, Tabs, Badge, Table, Dialog, Toast, Skeleton, EmptyState, Alert, Breadcrumb, Pagination.
- [ ] P2.04 Build desktop header and responsive mobile navigation.
- [ ] P2.05 Build route shells for all required pages.
- [ ] P2.06 Build loading/error/empty/permission states.
- [ ] P2.07 Add design documentation and anti-slop lint/review checklist.
- [ ] P2.08 Add Storybook or equivalent isolated component previews if beneficial.
- [ ] P2.09 Capture 375/768/1440 screenshots in light/dark modes.
- [ ] P2.10 Run accessibility and keyboard audit.

**Deliverables:** Component library, route shell, design docs, visual baselines.

**Gate:** No dead controls or inaccessible navigation; design tokens consistently applied.

### Phase 3 — API contract and persistence

- [ ] P3.01 Define OpenAPI 3.1 paths, security, errors, pagination, and schema versions.
- [ ] P3.02 Implement Zod contracts and generated frontend client.
- [ ] P3.03 Define Prisma entities, constraints, indexes, and migrations.
- [ ] P3.04 Seed plans, help content, demo property, and source registry metadata.
- [ ] P3.05 Implement typed domain services and thin route handlers.
- [ ] P3.06 Add API request logging, validation, and RFC 9457 errors.
- [ ] P3.07 Add contract tests and schema drift checks.
- [ ] P3.08 Add DB transaction and tenant-isolation integration tests.

**Deliverables:** OpenAPI spec, generated client, schema, migrations, service skeleton.

**Gate:** Contract tests and real PostgreSQL integration tests pass.

### Phase 4 — Clerk account and security

- [ ] P4.01 Configure Clerk development and production instances.
- [ ] P4.02 Implement sign-in and sign-up pages with approved styling.
- [ ] P4.03 Implement route guards and server-side identity extraction.
- [ ] P4.04 Implement verified, idempotent Clerk user webhooks.
- [ ] P4.05 Implement `/me` and preferences endpoints.
- [ ] P4.06 Build avatar dropdown and account management modal/screen.
- [ ] P4.07 Wire profile, security, and connected accounts to Clerk-supported flows.
- [ ] P4.08 Implement notification preferences in app database.
- [ ] P4.09 Test sign-out, MFA, OAuth, expired sessions, and unauthorized access.

**Deliverables:** Working identity and account UX.

**Gate:** Cross-user access denied and provider-managed security functions work end-to-end.

### Phase 5 — Billing and lookup ledger

- [ ] P5.01 Verify current Clerk Billing capabilities and document adapter choice.
- [ ] P5.02 Configure plans and sandbox billing products.
- [ ] P5.03 Implement entitlement periods and free lifetime grant.
- [ ] P5.04 Implement transactional reservation, settlement, release, and idempotency.
- [ ] P5.05 Implement billing webhooks, dedupe, reconciliation, and status handling.
- [ ] P5.06 Implement `/plans`, `/me/usage*`, `/me/subscription*`, invoice endpoints.
- [ ] P5.07 Build Usage and Billing screens with real data.
- [ ] P5.08 Add abuse limits for unlimited tier.
- [ ] P5.09 Test concurrent requests, failed payments, period reset, and subscription changes.

**Deliverables:** Usage ledger, billing adapter, functioning plan/usage screens.

**Gate:** No duplicate charge; free five-use limit and paid allowances enforced server-side.

### Phase 6 — Property resolution and first jurisdiction

- [ ] P6.01 Implement address normalization and internal property lookup.
- [ ] P6.02 Integrate Census geocoder with timeout, retries, and source metadata.
- [ ] P6.03 Identify jurisdiction via authoritative boundaries.
- [ ] P6.04 Choose one pilot county with verifiable free parcel GIS access.
- [ ] P6.05 Build county parcel adapter and spatial point/polygon query.
- [ ] P6.06 Support multiple candidate parcels and user disambiguation.
- [ ] P6.07 Persist canonical parcel/property/address mapping.
- [ ] P6.08 Implement `/properties/resolve`, summary, and map endpoints.
- [ ] P6.09 Add fixture-based tests for ambiguous, missing, and rural addresses.

**Deliverables:** Real address-to-parcel resolution in one pilot jurisdiction.

**Gate:** At least several independently verified pilot addresses resolve to correct parcels; failures are explicit.

### Phase 7 — Public source registry and deterministic retrieval

- [ ] P7.01 Implement source registry, coverage, license, and health models.
- [ ] P7.02 Build reusable HTTP/GIS adapters, caching, rate limits, retries, and circuit breakers.
- [ ] P7.03 Integrate FEMA flood geometry overlay.
- [ ] P7.04 Integrate USGS elevation and slope calculation.
- [ ] P7.05 Integrate USFWS wetlands, USDA soil, EPA hazards where coverage exists.
- [ ] P7.06 Integrate pilot county tax/assessment and ownership data.
- [ ] P7.07 Integrate pilot zoning map and ordinance retrieval.
- [ ] P7.08 Add recorded deed/permit retrieval where legally accessible.
- [ ] P7.09 Add water, wildfire, mining, and broadband adapters as applicable.
- [ ] P7.10 Normalize facts, preserve conflicts, calculate coverage, and store snapshots.
- [ ] P7.11 Implement jurisdiction onboarding workflow and approval checks.
- [ ] P7.12 Add source outage/partial data test suite.

**Deliverables:** Reusable source connectors, evidence store, coverage reporting.

**Gate:** Evidence provenance and licensing are recorded; no silent source failures.

### Phase 8 — AI interpretation and durable workflow

- [ ] P8.01 Select and configure durable workflow provider.
- [ ] P8.02 Implement research run state machine and durable stage jobs.
- [ ] P8.03 Implement idempotent source retrieval stages with checkpoints.
- [ ] P8.04 Implement document section indexing and selective extraction.
- [ ] P8.05 Define structured AI prompts for zoning, risk, and report synthesis.
- [ ] P8.06 Validate AI findings against evidence references.
- [ ] P8.07 Add model invocation telemetry, usage and cost ledger, trace propagation.
- [ ] P8.08 Add budgets, max calls, timeouts, concurrency, and kill switch.
- [ ] P8.09 Implement report completeness rules and credit settlement policy.
- [ ] P8.10 Implement authenticated SSE progress with replay and polling fallback.
- [ ] P8.11 Implement cancellation and failure recovery.
- [ ] P8.12 Build Researching Your Property screen with actual stages.
- [ ] P8.13 Run adversarial evaluation fixture suite.

**Deliverables:** Durable, metered cold-start research pipeline.

**Gate:** New address can produce a source-cited report, survive browser closure/retry, and reconcile credits/costs.

### Phase 9 — Research report experience

- [ ] P9.01 Build report view and tab routing.
- [ ] P9.02 Implement Overview projection and risk summary.
- [ ] P9.03 Implement Ownership with source and privacy limitations.
- [ ] P9.04 Implement Assessment & Taxes with historical records and calculations.
- [ ] P9.05 Implement Zoning & Use with ordinance links, conditions, and unknowns.
- [ ] P9.06 Implement Market Insights using only substantiated public data.
- [ ] P9.07 Implement History timeline with filters and evidence references.
- [ ] P9.08 Add parcel map, hazard overlays, and geometry controls.
- [ ] P9.09 Implement source detail drawer and evidence verification indicators.
- [ ] P9.10 Add PDF/export only if explicitly approved; otherwise keep scope to web report.
- [ ] P9.11 Add report loading/partial/stale/unavailable states.
- [ ] P9.12 Verify all figures against source data and calculated totals.

**Deliverables:** Six fully functional report tabs.

**Gate:** Every material claim has evidence or an explicit unknown label; no mock data leaks to real reports.

### Phase 10 — Saved properties, comparisons, and activity

- [ ] P10.01 Implement saved-property CRUD and notes/tags.
- [ ] P10.02 Build Saved Properties list, search, filters, sorting, pagination.
- [ ] P10.03 Implement report reopen without charge.
- [ ] P10.04 Implement refresh confirmation and credit reservation.
- [ ] P10.05 Implement comparison using selected report snapshots.
- [ ] P10.06 Persist activity events from actual application/research events.
- [ ] P10.07 Build All Activity page with date/property/category filters.
- [ ] P10.08 Add recent activity summary to Saved Properties.
- [ ] P10.09 Add optional scheduled change monitoring behind a disabled feature flag.
- [ ] P10.10 Test privacy, deduplication, and historical snapshot consistency.

**Deliverables:** Saved Properties, comparison, and Activity screens.

**Gate:** No invented activity, no credit consumed on save/reopen, no cross-user leakage.

### Phase 11 — Help, support, and notifications

- [ ] P11.01 Create help topic/article content model and seed initial content.
- [ ] P11.02 Build Help & Support landing, topic, article, and search pages.
- [ ] P11.03 Implement support ticket creation and authenticated retrieval.
- [ ] P11.04 Build Send Us a Message form and confirmation state.
- [ ] P11.05 Add private attachments only after secure upload pipeline is tested.
- [ ] P11.06 Implement notification preferences and transactional delivery.
- [ ] P11.07 Test accessibility, rate limits, spam controls, and user isolation.

**Deliverables:** Functional help and support system.

**Gate:** Tickets persist, users can access only their own requests, and messaging states are accurate.

### Phase 12 — Admin operations and observability

- [ ] P12.01 Implement admin role enforcement.
- [ ] P12.02 Build research run diagnostics and retry/replay tools.
- [ ] P12.03 Build per-run token/cost reports and aggregate unit economics.
- [ ] P12.04 Build source health and licensing dashboards.
- [ ] P12.05 Build quality/evaluation dashboard.
- [ ] P12.06 Add budget alerts, job backlog alerts, source outage alerts.
- [ ] P12.07 Add runbooks for failures, billing reconciliation, and incident response.

**Deliverables:** Admin APIs, diagnostics, alerting, and runbooks.

**Gate:** Operators can explain any research charge and trace every material finding to a source.

### Phase 13 — Hardening and production release

- [ ] P13.01 Run full typecheck, lint, unit, integration, contract, and e2e suites.
- [ ] P13.02 Run Playwright visual regression on all routes at 375/768/1440 in both themes.
- [ ] P13.03 Run WCAG 2.2 AA audit and keyboard/screen-reader checks.
- [ ] P13.04 Run security tests: IDOR, SSRF, injection, webhook replay, upload abuse.
- [ ] P13.05 Run concurrency/load tests for lookup reservations and job execution.
- [ ] P13.06 Benchmark cold-start performance and cost in pilot jurisdiction.
- [ ] P13.07 Validate production secrets, database backup/restore, rollback, and observability.
- [ ] P13.08 Test sandbox-to-live billing transition and webhook reconciliation.
- [ ] P13.09 Publish public methodology, limitations, privacy policy, terms, and support information.
- [ ] P13.10 Execute staged deployment with smoke tests and rollback criteria.
- [ ] P13.11 Monitor post-release error rates, completion rates, and cost per report.

**Deliverables:** Production deployment, release notes, operations checklist, benchmark report.

**Gate:** All critical defects closed; no fabricated research, unauthorized access, or unaccounted credit charges.

---

## 16. Testing matrix

| Test level | Required coverage |
|---|---|
| Unit | Parsers, calculations, token accounting, zoning rule extraction helpers, credit transitions |
| Integration | PostgreSQL transactions, GIS adapters, source caching, Clerk/billing webhook processing |
| Contract | OpenAPI/Zod compatibility, error shapes, pagination, generated client |
| Workflow | Retry, crash recovery, cancellation, partial report, stale cache, budget exhaustion |
| Security | IDOR, SSRF, auth bypass, webhook replay, PII leakage, upload abuse |
| E2E | Register → lookup → progress → report → save → reopen → usage → billing |
| Visual | Every page and modal in both themes, responsive breakpoints |
| Accessibility | Keyboard, focus, semantics, screen reader, contrast, reduced motion |
| Research evaluation | Citation fidelity, source accuracy, conflicting facts, missing-data honesty |
| Performance | p50/p90/p99 stage latency, throughput, database queries, provider request budgets |

**Pilot research fixtures:** normal suburban parcel; vacant rural acreage; multi-parcel listing; zoning restriction; inaccessible deed; flood overlap; mineral claim; missing public sales price; contradictory assessment; source outage; ambiguous geocode; unverified water rights.

---

## 17. Product analytics and success metrics

Track with privacy-conscious, pseudonymous analytics:

- Address resolution success and ambiguity rate.
- Parcel verification rate and geographic coverage.
- Research completion/partial/failure rate by jurisdiction.
- Median and p90 research latency (actual, not estimated).
- AI input/output/cached tokens and model cost per report.
- External request and compute cost per report.
- Evidence completeness and citation validation pass rate.
- Cache hit ratio at property, jurisdiction, and regional levels.
- Lookup utilization by tier and contribution margin.
- Saved-property conversion, report reopen rate, support ticket rate.
- Source connector failures, stale data rate, and operator interventions.

Define event schemas and retention limits before collecting analytics. Do not expose precise property searches publicly or in marketing telemetry.

---

## 18. Open decisions and default policies

| Decision | Recommended default | Requires verification/approval |
|---|---|---|
| Paid prices | Configuration only; no hardcoded example prices | Yes |
| Billing provider | Clerk Billing if features suffice | Yes |
| Workflow provider | Inngest or Trigger.dev after comparison | Yes |
| Initial geography | One pilot county with accessible GIS | Yes |
| Partial report credit | No silent charge; release or explicit opt-in | Yes |
| Monitoring | Disabled until scheduled refresh implemented | No |
| Random lookup | Curated demo only; free | No |
| Data provider fees | Zero per-record/subscription fees in MVP | No |
| Dark mode | Implement tokens; light default | No |
| Estimated time remaining | Hide until calibrated | No |
| Report export | Out of initial scope unless approved | Yes |
| AI confidence score | Omit unless calibrated and explainable | No |
| Unknown risk | Neutral/unknown, never low risk | No |

---

## 19. Final handoff instructions

When an autonomous agent receives this document:

1. Start with the mandatory repository capability scan; **do not skip it**.
2. Treat this specification as the product and engineering baseline, but inspect existing code and preserve already-complete work.
3. Convert every phase checkbox into a trackable issue/task with dependencies and acceptance criteria.
4. Implement the smallest end-to-end vertical slice first: **address → verified parcel → public evidence → structured interpretation → immutable report → usage ledger**.
5. Build and validate UI against the provided mockups, but correct any mockup that implies unverified property facts, impossible free data, fake activity, or unsupported integrations.
6. Maintain deterministic mocks for development and tests; do not make tests depend on live government endpoints.
7. Prefer reusable connectors, typed contracts, and measurable workflows over one-off scraping and monolithic AI prompts.
8. Run tests after each completed phase and record objective evidence in the progress ledger.
9. Stop and request explicit human action only for true external dependencies or consequential decisions (credentials, billing activation, production deploy, legal terms, unavailable public records); otherwise continue implementation.
10. At handoff, provide commit references, changed files, deployed preview URL if verified, tests and results, known limitations, costs observed, and the next unblocked tasks.

**Final product standard:** PropertyLens must be a genuinely functioning, evidence-first property due-diligence application. It must not merely reproduce attractive mockups or generate plausible but unsupported property claims.
