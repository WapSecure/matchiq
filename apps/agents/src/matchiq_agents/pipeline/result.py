"""Assembles the `PipelineResult` contract from the final run state."""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import (
    AgentRun,
    AgentStep,
    IssueCode,
    PipelineResult,
    PipelineStatus,
    Verdict,
    VerificationResult,
)
from matchiq_agents.domain.facts import FactView
from matchiq_agents.guard.checks import issue
from matchiq_agents.pipeline.reasons import INTEGRITY_PREFIX, join_reasons
from matchiq_agents.pipeline.state import PipelineState

SCHEMA_VERSION: Final = 1


def build_result(
    view: FactView, state: PipelineState, steps: Sequence[AgentStep] = ()
) -> PipelineResult:
    narratives = [draft for draft in state.localised if draft.persona in view.personas]
    payload: dict[str, object] = {
        "schemaVersion": SCHEMA_VERSION,
        "runId": view.run_id,
        "correlationId": view.correlation_id,
        "status": state.status,
        "analysis": state.analysis,
        "verification": state.verification,
        "narratives": narratives if state.status is not PipelineStatus.REJECTED else [],
        "overlay": state.overlay if state.status is not PipelineStatus.REJECTED else None,
        "runs": list(state.runs),
        "steps": list(steps),
    }
    reason = join_reasons(state.fallback_reasons)
    if reason is not None:
        payload["fallbackReason"] = reason
    return PipelineResult.model_validate(payload)


def rejected_result(
    view: FactView, problems: Sequence[str], runs: Sequence[AgentRun] = ()
) -> PipelineResult:
    """Suppresses an insight whose packet is internally inconsistent; nothing is narrated."""
    verification = VerificationResult(
        verdict=Verdict.REJECT,
        issues=[issue(IssueCode.SCHEMA_VIOLATION, problem) for problem in problems],
    )
    state = PipelineState(
        status=PipelineStatus.REJECTED,
        verification=verification,
        fallback_reasons=tuple(f"{INTEGRITY_PREFIX}{problem}" for problem in problems),
        runs=tuple(runs),
    )
    return build_result(view, state)
