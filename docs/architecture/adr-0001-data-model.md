# ADR 0001: Data model

**Status:** Accepted

## Context

SPECIFICATION.md section 6 defines the product's core entities and invariants:
immutable research reports, append-only usage/cost ledgers, atomic credit
reservations, and evidence facts that always carry a verification level and
source reference.

## Decision

Modeled nearly all of section 6.1 directly as Prisma models in
`prisma/schema.prisma`: identity/preferences, plans/subscriptions/entitlement
periods/usage ledger/credit reservations, jurisdictions/properties/parcels,
public data sources/evidence documents/evidence facts, research
runs/stages/events/reports/findings/coverage assessments, model invocations
and cost ledger entries, saved properties/activity/property changes, help
content, support tickets, notifications, webhook events, and audit logs.

Key invariants enforced structurally:
- `UsageLedgerEntry` and `CostLedgerEntry` are never updated/deleted by
  application code — corrections are compensating entries.
- `CreditReservation` has a unique constraint on `(userId, idempotencyKey)`
  and on `researchRunId`, preventing double-charging a single run.
- `EvidenceFact.verification` is a required enum (never silently omitted),
  and `caveats` is a first-class array field so downstream UI cannot drop
  uncertainty information.

## Consequences

Any new domain feature must extend this schema rather than inventing
parallel storage, and must preserve the append-only/idempotent invariants
above when writing new queries.
