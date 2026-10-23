# ADR-0007: Tenant-ready schema, not enforced multi-tenancy

- Status: Accepted (2026-10-21). Enforcement superseded by ADR-0018 (2026-10-22): tenant isolation is now enforced in the application and by Postgres row-level security.

## Decision

> Superseded in part by ADR-0018: tenant isolation is now enforced in the application and by Postgres row-level security, and MatchIQ may claim it as described there. The text below records the original decision.

Every business table carries `org_id`, and contracts include `orgId` where relevant. The demo runs as a single synthetic organisation (`DEMO_ORG_ID`). Application-level tenant checks and database row-level security are **not** implemented for the hackathon.

## Consequences

> Superseded in part by ADR-0018: the first bullet no longer holds. ADR-0018 delivered the authorization and RLS tests and the isolation claim.

- MatchIQ does **not** claim tenant isolation. That claim requires authorization tests and RLS tests passing (spec MQ-019).
- Adding enforcement later needs no destructive migration.
