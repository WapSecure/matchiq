# ADR-0032: Organisation, membership, fixture entitlement and consent model are deferred

- Status: Accepted as a deferral (2026-10-23). Spec §40, §41. Recorded by MQ-067. Numbers 0030 to 0036 were chosen to avoid collisions with ADRs that parallel work may add.

## Context

Spec §40 defines Organization → Workspace → Fixture → Feed/Publication, memberships with status, policy checks that include fixture entitlement and data rights, and revoked memberships invalidating access. ADR-0018 delivered roles, a single organisation per token and Postgres row-level security.

## Decision

The organisation, workspace and membership tables, per-fixture entitlement, consent records and member management are deferred until after the hackathon. The organisation comes only from the token claim, roles come from the identity provider, and every fixture in an organisation is visible to its roles. The `members:manage` and `policy:configure` permissions are reserved with no route.

## Consequences

- There are no organisation or membership rows in the database, so MatchIQ cannot list members, invite, suspend or remove them. A role change takes effect only when the user next gets a token (up to 5 minutes).
- There is no fixture entitlement. "Assigned fixtures" in §40 is not modelled.
- There is no consent capture for personal data or for use of a fixture or output.
- The claim stays as ADR-0018 states it: tenant isolation in the application and by RLS. No SCIM, self-service or membership workflow is claimed.

## What it would take

- `organizations`, `workspaces`, `memberships` and `fixture_entitlements` tables with RLS, and a sync from the identity provider.
- Policy evaluation that adds entitlement and data-rights checks to the existing permission guard.
- Membership revocation that invalidates sessions faster than the token lifetime (token introspection or a deny list).
- A consent record with purpose, version and timestamp, plus acceptance tests from §40.
