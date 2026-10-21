# ADR-0003: Python agents service on Microsoft Agent Framework + Foundry

- Status: Accepted (2026-10-21). Refines spec ADR-001 (TypeScript-first).

## Context

Microsoft Agent Framework ships Python and .NET SDKs, not TypeScript. The challenge rewards a genuine Foundry and multi-agent integration.

## Decision

`apps/agents` is a stateless FastAPI service using `agent-framework-core==1.22.0` and `agent-framework-foundry==1.15.0`. This is the only Python in the system. Credentials come from `ManagedIdentityCredential` in Azure and `AzureCliCredential` locally; no API keys. The API was verified against Microsoft Learn ("Microsoft Foundry model provider", updated 2026-10-06), and `tests/test_foundry_sdk.py` guards it.

Contracts flow Zod → JSON Schema (`nx run contracts:export-json-schema`) → Pydantic (`nx run agents:codegen`). Shared sample payloads are validated by both test suites. CI fails on generated-code drift.

## Consequences

- Contracts are maintained in one language and generated for the other.
- A second toolchain (uv, Ruff, Pyright) runs in CI.
- If Foundry access is unavailable, the service runs with `MODEL_PROVIDER=mock`, reports `degraded` readiness, and the worker publishes deterministic templates. This is never presented as a live integration.
