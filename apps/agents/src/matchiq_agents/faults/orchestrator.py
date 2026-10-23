"""Routes requests that carry a demo fault to an isolated, faulted pipeline (ADR-0017).

A faulted run gets its own circuit breaker, so a demo can open a breaker without degrading any
other session, and every run of its trace is labelled `faultInjected`.
"""

import logging
from collections.abc import Callable

from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.generated.PipelineResult import FaultScenario as RunFault
from matchiq_agents.contracts.types import (
    AgentName,
    AgentRun,
    PipelineRequest,
    PipelineResult,
    RunOutcome,
)
from matchiq_agents.faults.constants import (
    NOTE_MAX,
    NOTE_REVISE,
    NOTE_REVISION,
    NOTE_SHORT_CIRCUIT,
    NOTE_TIMEOUT,
    NOTES_SEPARATOR,
    REASON_BREAKER_OPEN,
    REASON_MAX,
    REASON_SEPARATOR,
)
from matchiq_agents.faults.model import FaultInjectingModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.models.resilience import BreakerState, CircuitBreaker
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator

logger = logging.getLogger(__name__)

FaultedPipeline = Callable[[ModelPort, CircuitBreaker], PipelineOrchestrator]


def _revise_notes(
    model: FaultInjectingModel, run: AgentRun, seen: dict[AgentName, int]
) -> str | None:
    nth = seen[run.agent]
    if run.agent is AgentName.NARRATIVE_WRITER and nth == 1:
        return model.corruption_note
    if run.agent is AgentName.FACT_CHECKER and nth == 1 and model.revision_notes:
        return NOTE_REVISE.format(notes=NOTES_SEPARATOR.join(model.revision_notes))
    if run.agent is AgentName.NARRATIVE_WRITER and nth == 2 and model.revision_notes:
        return NOTE_REVISION
    return None


def _timeout_note(
    model: FaultInjectingModel, run: AgentRun, seen: dict[AgentName, int]
) -> str | None:
    if run.outcome is RunOutcome.TIMED_OUT and seen[run.agent] == 1:
        return NOTE_TIMEOUT
    if run.outcome is RunOutcome.FAILED and model.calls[run.agent] == 0:
        return NOTE_SHORT_CIRCUIT
    return None


def label_runs(model: FaultInjectingModel, runs: list[AgentRun]) -> list[AgentRun]:
    """Marks every run as simulated and annotates the steps of the recovery chain."""
    fault = RunFault(model.scenario.value)
    note_for = _timeout_note if model.scenario is FaultScenario.MODEL_TIMEOUT else _revise_notes
    seen: dict[AgentName, int] = dict.fromkeys(AgentName, 0)
    labelled: list[AgentRun] = []
    for run in runs:
        seen[run.agent] += 1
        update: dict[str, object] = {"faultInjected": fault}
        note = note_for(model, run, seen)
        if note:
            update["faultNote"] = note[:NOTE_MAX]
        labelled.append(run.model_copy(update=update))
    return labelled


def _with_reason(current: str | None, extra: str) -> str:
    return (REASON_SEPARATOR.join(filter(None, (current, extra))))[:REASON_MAX]


class FaultAwareOrchestrator:
    def __init__(
        self,
        base: PipelineOrchestrator,
        *,
        enabled: bool,
        faulted: FaultedPipeline,
        breaker: Callable[[], CircuitBreaker],
    ) -> None:
        self._base = base
        self._enabled = enabled
        self._faulted = faulted
        self._breaker = breaker

    @property
    def model(self) -> ModelPort:
        return self._base.model

    async def run(self, request: PipelineRequest) -> PipelineResult:
        scenario = request.fault
        if scenario is None:
            return await self._base.run(request)
        if not self._enabled:
            logger.warning("demo fault ignored: DEMO_FAULTS_ENABLED is off")
            return await self._base.run(request)
        model = FaultInjectingModel(self._base.model, scenario)
        breaker = self._breaker()
        result = await self._faulted(model, breaker).run(request)
        update: dict[str, object] = {"runs": label_runs(model, list(result.runs))}
        if breaker.state is BreakerState.OPEN:
            update["fallbackReason"] = _with_reason(result.fallbackReason, REASON_BREAKER_OPEN)
        return result.model_copy(update=update)
