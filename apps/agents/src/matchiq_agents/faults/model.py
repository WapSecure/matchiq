"""`ModelPort` decorator that injects one demo fault scenario into a single pipeline run.

It wraps whichever provider is configured (mock, ollama, foundry), so the chain that follows,
the Fact Checker, retries, the circuit breaker and the templates, is the real pipeline.
"""

from collections import Counter
from typing import cast

from pydantic import BaseModel

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.types import AgentName, RunProvider
from matchiq_agents.faults.constants import (
    INJECTED_METRIC_REF,
    INJECTED_VALUE,
    NOTE_CORRUPTED,
    SIMULATED_TIMEOUT,
)
from matchiq_agents.models.port import ModelPort, ModelUsage
from matchiq_agents.roster.schemas import CitedValueOut, WriterInput, WriterOutput


def corrupt_first_draft(output: WriterOutput) -> tuple[WriterOutput, str | None]:
    """Adds an ungrounded citation to the first draft; the deterministic checks must flag it."""
    if not output.drafts:
        return output, None
    first = output.drafts[0]
    injected = CitedValueOut(metric_ref=INJECTED_METRIC_REF, value=INJECTED_VALUE)
    altered = first.model_copy(update={"cited_values": [*first.cited_values, injected]})
    note = NOTE_CORRUPTED.format(persona=first.persona.lower())
    return output.model_copy(update={"drafts": [altered, *output.drafts[1:]]}), note


class FaultInjectingModel:
    """One instance per faulted request; it counts calls, so it must not be shared."""

    def __init__(self, inner: ModelPort, scenario: FaultScenario) -> None:
        self._inner = inner
        self._scenario = scenario
        self.calls: Counter[AgentName] = Counter()
        self.corruption_note: str | None = None
        self.revision_notes: tuple[str, ...] = ()

    @property
    def scenario(self) -> FaultScenario:
        return self._scenario

    @property
    def provider(self) -> RunProvider:
        return self._inner.provider

    @property
    def deployment(self) -> str | None:
        return self._inner.deployment

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        self.calls[agent_name] += 1
        if self._scenario is FaultScenario.MODEL_TIMEOUT:
            # Raised at once: the runner treats it exactly like an expired per-call budget.
            raise TimeoutError(SIMULATED_TIMEOUT)
        parsed, usage = await self._inner.generate(
            agent_name, instructions, payload, response_model, deadline
        )
        if self._scenario is not FaultScenario.WRITER_REVISE or not isinstance(
            parsed, WriterOutput
        ):
            return parsed, usage
        if isinstance(payload, WriterInput) and payload.revision_notes:
            self.revision_notes = tuple(payload.revision_notes)
        if self.corruption_note is not None:
            return parsed, usage
        corrupted, self.corruption_note = corrupt_first_draft(parsed)
        return cast(T, corrupted), usage
