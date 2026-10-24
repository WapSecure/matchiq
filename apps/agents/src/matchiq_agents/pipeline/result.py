"""Assembles the `PipelineResult` contract from the final run state."""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import (
    AgentRun,
    AgentStep,
    AnalystBreakdown,
    IssueCode,
    Locale,
    NarrativeDraft,
    Persona,
    PipelineResult,
    PipelineStatus,
    Verdict,
    VerificationResult,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.guard.checks import issue
from matchiq_agents.pipeline.reasons import INTEGRITY_PREFIX, join_reasons
from matchiq_agents.pipeline.state import PipelineState
from matchiq_agents.templates.breakdown import analyst_breakdown

SCHEMA_VERSION: Final = 1


def with_breakdowns(view: FactView, drafts: Sequence[NarrativeDraft]) -> list[NarrativeDraft]:
    """Each ANALYST draft gets the checked deterministic breakdown in its text's language.

    A breakdown that fails a check is left out, and the worker then attaches its own.
    """
    cache: dict[Locale, AnalystBreakdown | None] = {}
    out: list[NarrativeDraft] = []
    for draft in drafts:
        if draft.persona is not Persona.ANALYST or draft.breakdown is not None:
            out.append(draft)
            continue
        locale = CANONICAL_LOCALE if draft.localeFallback else draft.locale
        if locale not in cache:
            cache[locale] = analyst_breakdown(view, locale)
        breakdown = cache[locale]
        out.append(
            draft if breakdown is None else draft.model_copy(update={"breakdown": breakdown})
        )
    return out


def build_result(
    view: FactView, state: PipelineState, steps: Sequence[AgentStep] = ()
) -> PipelineResult:
    narratives = [draft for draft in state.localised if draft.persona in view.personas]
    if state.status is not PipelineStatus.REJECTED:
        narratives = with_breakdowns(view, narratives)
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
