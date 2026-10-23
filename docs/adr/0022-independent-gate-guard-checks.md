# ADR-0022: Independent guard checks in the worker publish gate

- Status: Accepted (2026-10-23). Implements spec §10 (Quality Gate: forbidden claims, repetition, tone), §28 and §46. Extends ADR-0002 (deterministic gate).

## Context

The worker's publish gate checked only schema, numbers, entities, evidence and length. The forbidden-claim, safety and injection checks existed only in the Python agents service, so a defect or bypass there would have reached air. Nothing checked repetition, tone or unsupported causal claims.

## Decision

- **A pure domain library.** `libs/narrative-guard` (`scope:shared`, `type:domain`) holds the rules as framework-free functions: `claimFindings`, `causalityFindings`, `phraseRepeats`, `recentRepeat` and `toneFindings`. The worker gate maps each finding to a new `GateIssueCode` (`INJECTION_ECHO`, `UNSUPPORTED_CAUSALITY`, `REPETITION`, `UNSAFE_TONE`) or the existing `FORBIDDEN_CLAIM`.
- **One lexicon, generated for Python.** The forbidden and safety patterns are TypeScript data in `lexicon.ts`, written in the regex dialect both engines share. The `narrative-guard:export-lexicon` target writes them to JSON, and `agents:codegen` copies the JSON into `matchiq_agents/contracts/generated/`, the same route the Zod contracts take to Pydantic. The agents image is built from `apps/agents` alone, so its copy must live inside the package. Drift tests in Vitest and pytest, plus CI's codegen diff, fail on any difference.
- **Reject, don't repair.** A failing draft is rejected, and its variant falls back to the deterministic template through the existing per-item fallback. Dropping a causal clause can change the claim, and a template is always available.
- **Repetition window.** For each agent job the worker reads the fixture's published narratives and keeps those whose insight was detected within 10 match minutes earlier in the same period. Templates are exempt from this check.

## Alternatives considered

- A JSON file imported by both sides. TypeScript would need JSON import attributes across tsc, SWC/Jest and webpack, and the agents image could not read a file outside `apps/agents`.
- Keeping the checks in Python only. This leaves the gate dependent on the service it is meant to check.
- An AI critique for tone and causality. This is not deterministic and needs a model at the gate. It stays optional in the agents service.

## Consequences

Adding the URL, markup, prompt-leakage and slur patterns to the shared lexicon also tightens the Python guard. The checks are deliberately narrow. Subtler toxicity remains for a hosted classifier (`ContentSafetyScreen`) once Azure exists (ADR-0003).
