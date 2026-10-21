# ADR-0012: Local-first, cloud-ready AI providers

- Status: Accepted (2026-10-21)
- Context: the owner has no Azure subscription and no hackathon credits yet. MatchIQ must still run end to end with real inference and no paid API.

## Decision

The agents service selects one model provider with `MODEL_PROVIDER`:

| Provider  | Use                                                                | Implementation                                                                                                                                    |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock`    | Automated tests and CI                                             | Deterministic, input-seeded responses                                                                                                             |
| `ollama`  | Real local inference (default for demos without Azure)             | Agent Framework `OpenAIChatClient` (`agent-framework-openai`, GA) against Ollama's OpenAI-compatible endpoint, `OLLAMA_ENDPOINT` + `OLLAMA_MODEL` |
| `foundry` | Microsoft Foundry when a subscription exists (target architecture) | Agent Framework `FoundryChatClient`, managed identity                                                                                             |

Deterministic templates (`template`) remain the fallback for every provider. `ModelProvider` in the contracts includes `ollama`, so every `AgentRun` records the provider that actually produced the output.

The GA OpenAI-compatible client is preferred over the pre-release `agent-framework-ollama` package, following the Microsoft Learn Ollama provider page (updated 2026-10-15).

## Consequences

- The football engine, replay and overlays never depend on any provider (ADR-0002).
- The Foundry adapter is maintained with contract tests. The live Foundry integration stays **unverified** until it is exercised against a real deployment.
- Azure infrastructure is authored as Bicep but not deployed without owner approval.
