"""`AgentStep` handoff records (spec §28, §46): one per roster stage a run passes through.

Each record names the stage, the prompt version and model that ran, the FSM transition, the
decision and why, a checksum of what the stage received, the evidence it cited, and the usage
of its model calls. The orchestrator owns one recorder per run.
"""

import hashlib
import json
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from typing import Final

from pydantic import BaseModel

from matchiq_agents.contracts.types import (
    AgentRun,
    AgentStep,
    AgentStepDecision,
    AgentStepRole,
    NarrativeDraft,
    RunProvider,
)
from matchiq_agents.pipeline.budget import RunBudget
from matchiq_agents.pipeline.runner import ModelRunner
from matchiq_agents.pipeline.state import PipelineState
from matchiq_agents.telemetry.agent_spans import agent_step_span, annotate
from matchiq_agents.templates.fallback import TEMPLATE_VERSION

D = AgentStepDecision
MAX_STEPS: Final = 32
EVIDENCE_MAX: Final = 64
RETRIES_MAX: Final = 64
BUDGET_EXCEEDED: Final = "BUDGET_EXCEEDED"
BUDGET_REASON: Final = "run budget exceeded ({limit}); deterministic templates used"


@dataclass(frozen=True, slots=True)
class StepOutcome:
    decision: AgentStepDecision
    code: str
    reason: str


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def checksum(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def _dump(value: BaseModel | None) -> object:
    return None if value is None else value.model_dump(mode="json", exclude_none=True)


def handoff(state: PipelineState) -> dict[str, object]:
    """What a stage receives from the previous one; run timings are excluded on purpose."""
    return {
        "status": state.status.value,
        "route": state.route.value,
        "analysis": _dump(state.analysis),
        "canonical": [_dump(draft) for draft in state.canonical],
        "localised": [_dump(draft) for draft in state.localised],
        "verification": _dump(state.verification),
        "overlay": _dump(state.overlay),
        "draftAttempts": state.draft_attempts,
        "revisionNotes": list(state.revision_notes),
        "revisionPersonas": [persona.value for persona in state.revision_personas],
        "fallbackReasons": list(state.fallback_reasons),
    }


def _unique(items: Sequence[str]) -> list[str]:
    return list(dict.fromkeys(items))[:EVIDENCE_MAX]


def _drafts_evidence(drafts: Sequence[NarrativeDraft]) -> tuple[list[str], list[str]]:
    events = [str(event.root) for draft in drafts for event in draft.evidenceEventIds]
    refs = [cited.metricRef for draft in drafts for cited in draft.citedValues]
    return events, refs


def evidence(role: AgentStepRole, state: PipelineState) -> tuple[list[str], list[str]]:
    """The event ids and metric refs the stage's output cites, first-seen order, deduplicated."""
    events: list[str] = []
    refs: list[str] = []
    if role is AgentStepRole.MATCH_ANALYST and state.analysis is not None:
        claims = state.analysis.claims
        events = [str(event.root) for claim in claims for event in claim.evidenceEventIds]
        refs = [cited.metricRef for claim in claims for cited in claim.citedValues]
    elif role is AgentStepRole.BROADCAST_PRODUCER and state.overlay is not None:
        events = [str(event.root) for event in state.overlay.evidenceEventIds]
        refs = [str(ref.root) for ref in state.overlay.metricRefs]
    elif role is AgentStepRole.LOCALIZATION:
        events, refs = _drafts_evidence(state.localised)
    else:
        events, refs = _drafts_evidence(state.canonical)
    return _unique(events), _unique(refs)


def _sum(values: Sequence[int | None]) -> int | None:
    known = [value for value in values if value is not None]
    return sum(known) if known else None


def _cost(runs: Sequence[AgentRun]) -> float | None:
    """Unknown when any model call has no price: an estimate must not under-report spend."""
    costs = [run.costEstimateUsd for run in runs]
    if any(cost is None for cost in costs):
        return None
    return round(sum(cost or 0.0 for cost in costs), 6)


def _usage(runs: Sequence[AgentRun]) -> dict[str, object]:
    model = next((run for run in runs if run.provider is not RunProvider.template), None)
    lead = model or (runs[0] if runs else None)
    version: dict[str, object] = {"promptVersion": lead.promptVersion if lead else TEMPLATE_VERSION}
    if model is not None and model.promptHash is not None:
        version["promptHash"] = model.promptHash
    usage: dict[str, object] = {
        "agentVersion": version,
        "provider": lead.provider if lead else RunProvider.template,
        "modelDeployment": model.modelDeployment if model else None,
        "tokensIn": _sum([run.tokensIn for run in runs]),
        "tokensOut": _sum([run.tokensOut for run in runs]),
        "costEstimateUsd": _cost(runs),
        "retries": min(RETRIES_MAX, sum(run.retries for run in runs)),
    }
    return {key: value for key, value in usage.items() if value is not None}


Work = Callable[[PipelineState], Awaitable[tuple[PipelineState, StepOutcome]]]


@dataclass(slots=True)
class StepRecorder:
    runner: ModelRunner
    request_checksum: str
    steps: list[AgentStep] = field(default_factory=list[AgentStep])
    # The state after the latest step, so an emergency fallback still records where it began.
    last: PipelineState | None = None

    @property
    def budget(self) -> RunBudget:
        return self.runner.budget

    async def record(self, role: AgentStepRole, before: PipelineState, work: Work) -> PipelineState:
        """Runs one stage inside its span and appends its handoff record."""
        scope, clock, budget = self.runner.scope, self.runner.clock, self.runner.budget
        started_at, started_ms = clock.now(), clock.monotonic_ms()
        refusals = budget.refusals
        received = checksum({"request": self.request_checksum, "state": handoff(before)})
        budget.hop()
        with agent_step_span(role, str(scope.correlation_id), scope.run_id) as span:
            after, outcome = await work(before)
            if budget.refusals > refusals and budget.exceeded is not None:
                reason = BUDGET_REASON.format(limit=budget.exceeded.value)
                outcome = StepOutcome(D.FALLBACK, BUDGET_EXCEEDED, reason)
                after = after.with_fallback(reason)
            events, refs = evidence(role, after)
            step = AgentStep.model_validate(
                {
                    "stepIndex": len(self.steps),
                    "role": role,
                    "runId": scope.run_id,
                    "correlationId": scope.correlation_id,
                    "fromStatus": before.status.value,
                    "toStatus": after.status.value,
                    "decision": outcome.decision,
                    "reasonCode": outcome.code,
                    "reason": outcome.reason[:200],
                    "inputChecksum": received,
                    "evidenceEventIds": events,
                    "metricRefs": refs,
                    "startedAt": started_at,
                    "latencyMs": max(0, round(clock.monotonic_ms() - started_ms)),
                    **_usage(after.runs[len(before.runs) :]),
                }
            )
            annotate(span, step)
        if len(self.steps) < MAX_STEPS:
            self.steps.append(step)
        self.last = after
        return after
