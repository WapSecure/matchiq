"""Fact Checker (spec §28): deterministic checks first, then an optional AI critique.

Deterministic checks are attributed per persona, so a failing persona is revised or replaced by
its template without discarding the drafts that passed. The critique can only add concerns; they
apply to the whole set, and it can never overturn a deterministic failure.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import (
    AgentResult,
    AgentRun,
    Issue,
    IssueCode,
    NarrativeDraft,
    NarrativeSource,
    Persona,
    RunOutcome,
    Verdict,
    VerificationResult,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.guard import messages
from matchiq_agents.guard.checks import check_analysis, check_draft, check_drafts, issue
from matchiq_agents.limits import MAX_DRAFT_ATTEMPTS
from matchiq_agents.pipeline import diagnostics
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import DETERMINISTIC_CHECKS_VERSION, AgentContext
from matchiq_agents.roster.convert import facts_payload, text_pairs
from matchiq_agents.roster.notes import revision_note
from matchiq_agents.roster.prompts import FACT_CHECKER
from matchiq_agents.roster.schemas import CritiqueInput, CritiqueOutput

# Contract has no critique-specific code; UNCITED_EVIDENCE is the closest ("claim not supported
# by the cited evidence"). See the proposed contract change in the implementation log.
CRITIQUE_CODE: Final = IssueCode.UNCITED_EVIDENCE
ALWAYS_REJECT: Final = frozenset({IssueCode.FORBIDDEN_CLAIM})
SCREEN_UNAVAILABLE: Final = "screen_unavailable"
REVISION_NOTE: Final = "{persona}: {detail}"


@dataclass(frozen=True, slots=True)
class Verification:
    by_persona: dict[Persona, list[Issue]]
    # Issues that concern every draft at once: the analysis or the AI critique.
    shared: list[Issue]
    attempt: int
    runs: tuple[AgentRun, ...]

    @property
    def verdict(self) -> Verdict:
        if not self.failing:
            return Verdict.PASS
        if self.attempt < MAX_DRAFT_ATTEMPTS and self.revisable:
            return Verdict.REVISE
        return Verdict.REJECT

    @property
    def result(self) -> VerificationResult:
        issues = [*self.shared, *(found for listed in self.by_persona.values() for found in listed)]
        return VerificationResult(verdict=self.verdict, issues=issues)

    @property
    def failing(self) -> frozenset[Persona]:
        if self.shared:
            return frozenset(self.by_persona)
        return frozenset(persona for persona, found in self.by_persona.items() if found)

    @property
    def revisable(self) -> tuple[Persona, ...]:
        """Failing personas that may be rewritten: a forbidden claim is never revised."""
        if any(found.code in ALWAYS_REJECT for found in self.shared):
            return ()
        return tuple(
            persona
            for persona in self.by_persona
            if persona in self.failing
            and not any(found.code in ALWAYS_REJECT for found in self.by_persona[persona])
        )

    def notes(self) -> tuple[str, ...]:
        personal = [
            REVISION_NOTE.format(persona=persona.value, detail=revision_note(found))
            for persona in self.revisable
            for found in self.by_persona[persona]
        ]
        return (*personal, *(revision_note(found) for found in self.shared))

    def passing(self, drafts: Sequence[NarrativeDraft]) -> tuple[NarrativeDraft, ...]:
        return tuple(draft for draft in drafts if draft.persona not in self.failing)


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


def _per_persona(ctx: AgentContext, drafts: Sequence[NarrativeDraft]) -> dict[Persona, list[Issue]]:
    by_persona: dict[Persona, list[Issue]] = {
        persona: [
            issue(
                IssueCode.SCHEMA_VIOLATION, messages.MISSING_PERSONA.format(persona=persona.value)
            )
        ]
        for persona in ctx.canonical_personas
    }
    for index, draft in enumerate(drafts):
        by_persona[draft.persona] = check_draft(draft, ctx.view, index)
    return by_persona


async def _screen(
    ctx: AgentContext, drafts: Sequence[NarrativeDraft]
) -> dict[Persona, list[Issue]]:
    """The hosted safety screen, when configured. It fails closed: an error is unsafe."""
    agent = [draft for draft in drafts if draft.source is NarrativeSource.AGENT]
    if ctx.safety is None or not agent:
        return {}
    texts = [f"{draft.headline}\n{draft.body}" for draft in agent]
    try:
        verdicts = await ctx.safety.screen(texts, CANONICAL_LOCALE)
    except Exception:
        verdicts = [[SCREEN_UNAVAILABLE] for _ in agent]
    return {
        draft.persona: [
            issue(IssueCode.FORBIDDEN_CLAIM, messages.UNSAFE.format(category=category))
            for category in categories
        ]
        for draft, categories in zip(agent, verdicts, strict=False)
        if categories
    }


async def _critique(
    ctx: AgentContext, drafts: Sequence[NarrativeDraft]
) -> tuple[list[Issue], AgentRun]:
    call = ModelCall(
        prompt=FACT_CHECKER,
        payload=CritiqueInput(
            facts=facts_payload(ctx.view, context=True, compact=ctx.compact),
            drafts=text_pairs(drafts),
        ),
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


def _report(
    ctx: AgentContext,
    shared: Sequence[Issue],
    by_persona: dict[Persona, list[Issue]],
    drafts: Sequence[NarrativeDraft],
    attempt: int,
) -> None:
    """Agent drafts only: a template that fails is a template bug, not model behaviour."""
    run_id = ctx.runner.scope.run_id
    texts = {d.persona: f"{d.headline}\n{d.body}" for d in drafts}
    agent_written = {d.persona for d in drafts if d.source is NarrativeSource.AGENT}
    diagnostics.report(run_id, FACT_CHECKER.agent, shared, attempt=attempt)
    for persona, found in by_persona.items():
        if persona in agent_written or persona not in texts:
            text = texts.get(persona, "")
            diagnostics.report(
                run_id, FACT_CHECKER.agent, found, persona=persona, attempt=attempt, text=text
            )


async def verify(
    ctx: AgentContext,
    analysis: AgentResult | None,
    drafts: Sequence[NarrativeDraft],
    attempt: int,
    *,
    critique: bool = True,
) -> Verification:
    started_ms = ctx.runner.clock.monotonic_ms()
    shared = check_analysis(analysis, ctx.view) if analysis is not None else []
    by_persona = _per_persona(ctx, drafts)
    runs = [
        ctx.local_run(
            FACT_CHECKER.agent, RunOutcome.SUCCEEDED, DETERMINISTIC_CHECKS_VERSION, started_ms
        )
    ]
    # The fallback round re-checks drafts that already passed the screen, plus templates.
    if critique and not shared and not any(by_persona.values()):
        by_persona.update(await _screen(ctx, drafts))
    _report(ctx, shared, by_persona, drafts, attempt)
    clean = not shared and not any(by_persona.values())
    if clean and critique and ctx.critique_enabled:
        shared, critique_run = await _critique(ctx, drafts)
        runs.append(critique_run)
    return Verification(by_persona, shared, attempt, tuple(runs))
