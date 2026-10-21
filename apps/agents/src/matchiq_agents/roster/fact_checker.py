"""Fact Checker (spec §28): deterministic checks first, then an optional AI critique.

The critique can only add concerns; it can never overturn a deterministic failure.
"""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import (
    AgentResult,
    AgentRun,
    Issue,
    IssueCode,
    NarrativeDraft,
    RunOutcome,
    Verdict,
    VerificationResult,
)
from matchiq_agents.guard import messages
from matchiq_agents.guard.checks import check_analysis, check_drafts, issue
from matchiq_agents.limits import MAX_DRAFT_ATTEMPTS
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import DETERMINISTIC_CHECKS_VERSION, AgentContext
from matchiq_agents.roster.convert import facts_payload, text_pairs
from matchiq_agents.roster.prompts import FACT_CHECKER
from matchiq_agents.roster.schemas import CritiqueInput, CritiqueOutput

# Contract has no critique-specific code; UNCITED_EVIDENCE is the closest ("claim not supported
# by the cited evidence"). See the proposed contract change in the implementation log.
CRITIQUE_CODE: Final = IssueCode.UNCITED_EVIDENCE
ALWAYS_REJECT: Final = frozenset({IssueCode.FORBIDDEN_CLAIM})


def decide(issues: Sequence[Issue], attempt: int) -> Verdict:
    if not issues:
        return Verdict.PASS
    if any(found.code in ALWAYS_REJECT for found in issues) or attempt >= MAX_DRAFT_ATTEMPTS:
        return Verdict.REJECT
    return Verdict.REVISE


def deterministic_issues(
    ctx: AgentContext, analysis: AgentResult | None, drafts: Sequence[NarrativeDraft]
) -> list[Issue]:
    found = check_analysis(analysis, ctx.view) if analysis is not None else []
    return found + check_drafts(drafts, ctx.view)


async def _critique(
    ctx: AgentContext, drafts: Sequence[NarrativeDraft]
) -> tuple[list[Issue], AgentRun]:
    call = ModelCall(
        prompt=FACT_CHECKER,
        payload=CritiqueInput(facts=facts_payload(ctx.view), drafts=text_pairs(drafts)),
        response_model=CritiqueOutput,
        convert=lambda output: output,
    )
    critique, run = await ctx.runner.run(call)
    if critique is None or critique.verdict == "PASS":
        return [], run
    concerns = critique.concerns or [FACT_CHECKER.agent.value]
    return [
        issue(CRITIQUE_CODE, messages.CRITIQUE.format(detail=concern)) for concern in concerns
    ], run


async def verify(
    ctx: AgentContext,
    analysis: AgentResult | None,
    drafts: Sequence[NarrativeDraft],
    attempt: int,
    *,
    critique: bool = True,
) -> tuple[VerificationResult, tuple[AgentRun, ...]]:
    started_ms = ctx.runner.clock.monotonic_ms()
    issues = deterministic_issues(ctx, analysis, drafts)
    runs = [
        ctx.local_run(
            FACT_CHECKER.agent, RunOutcome.SUCCEEDED, DETERMINISTIC_CHECKS_VERSION, started_ms
        )
    ]
    if not issues and critique and ctx.critique_enabled:
        issues, critique_run = await _critique(ctx, drafts)
        runs.append(critique_run)
    verdict = decide(issues, attempt)
    return VerificationResult(verdict=verdict, issues=list(issues)), tuple(runs)
