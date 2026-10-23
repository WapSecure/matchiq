"""Agent Framework executors: one per roster stage, connected by `workflow.build_workflow`.

Each executor receives the immutable `PipelineState`, performs at most one FSM transition and
sends the new state on. Routing lives in `state.route`, which the workflow's edge conditions read.
Every stage but `finalise` is recorded as one `AgentStep` handoff (`steps.StepRecorder`).
"""

from dataclasses import replace
from typing import ClassVar, Never

from agent_framework import Executor, WorkflowContext, handler

from matchiq_agents.contracts.types import (
    AgentStepRole,
    NarrativeSource,
    Persona,
    PipelineResult,
    PipelineStatus,
    RunProvider,
    Verdict,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline import step_reasons as outcomes
from matchiq_agents.pipeline.result import build_result
from matchiq_agents.pipeline.state import PipelineState, Route
from matchiq_agents.pipeline.steps import StepOutcome
from matchiq_agents.roster.analyst import analyse
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.fact_checker import verify
from matchiq_agents.roster.localization import localise_all
from matchiq_agents.roster.producer import produce
from matchiq_agents.roster.writer import merge_drafts, write

S = PipelineStatus
Step = tuple[PipelineState, StepOutcome]


class StageExecutor(Executor):
    def __init__(self, agents: AgentContext, executor_id: str) -> None:
        super().__init__(id=executor_id)
        self.agents = agents


class StepExecutor(StageExecutor):
    role: ClassVar[AgentStepRole]

    async def step(self, state: PipelineState) -> Step:
        raise NotImplementedError

    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        await ctx.send_message(await self.agents.recorder.record(self.role, state, self.step))


class AnalystExecutor(StepExecutor):
    role = AgentStepRole.MATCH_ANALYST

    async def step(self, state: PipelineState) -> Step:
        analysis, runs, reason = await analyse(self.agents)
        nxt = replace(state, analysis=analysis).with_runs(*runs)
        outcome = outcomes.GROUNDED
        if reason:
            nxt = nxt.with_fallback(reason)
            skipped = reason == reasons.ANALYST_SKIPPED
            outcome = outcomes.ANALYST_SKIPPED if skipped else outcomes.ANALYST_FALLBACK
        return nxt.advance(S.ANALYZED, Route.VERIFY), outcome


class WriterExecutor(StepExecutor):
    role = AgentStepRole.NARRATIVE_WRITER

    async def step(self, state: PipelineState) -> Step:
        analysis = state.analysis or self.agents.fallback.analysis()
        personas = state.revision_personas or self.agents.canonical_personas
        drafts, run = await write(self.agents, analysis, state.revision_notes, personas)
        nxt = replace(state, draft_attempts=state.draft_attempts + 1).with_runs(run)
        if drafts is None:
            failed = nxt.with_fallback(reasons.WRITER_FALLBACK)
            return failed.advance(S.FALLBACK, Route.FALLBACK), outcomes.WRITER_FALLBACK
        canonical = merge_drafts(self.agents, state.canonical, drafts)
        drafted = replace(nxt, canonical=canonical, revision_notes=(), revision_personas=())
        return drafted.advance(S.DRAFTED, Route.VERIFY), outcomes.DRAFTED


class FactCheckerExecutor(StepExecutor):
    """PASS localises; REVISE rewrites only the failing personas; REJECT keeps what passed."""

    role = AgentStepRole.FACT_CHECKER

    async def step(self, state: PipelineState) -> Step:
        checked = await verify(self.agents, state.analysis, state.canonical, state.draft_attempts)
        nxt = replace(state, verification=checked.result).with_runs(*checked.runs)
        passing = checked.passing(state.canonical)
        issues = checked.result.issues
        if checked.verdict is Verdict.PASS:
            return nxt.advance(S.VERIFIED, Route.LOCALISE), outcomes.VERIFIED
        if checked.verdict is Verdict.REVISE:
            revise = replace(
                nxt,
                canonical=passing,
                revision_notes=checked.notes(),
                revision_personas=checked.revisable,
            )
            outcome = outcomes.revision(checked.revisable, issues)
            return revise.advance(S.DRAFTED, Route.REVISE), outcome
        reason = reasons.replaced(checked.failing, issues) if passing else reasons.rejected(issues)
        rejected = replace(nxt, canonical=passing).with_fallback(reason)
        return rejected.advance(S.FALLBACK, Route.FALLBACK), outcomes.rejected(reason)


class FallbackExecutor(StepExecutor):
    """Fills every persona without a verified agent draft from deterministic templates.

    The merged set is verified like any other draft set; if it fails, the insight is suppressed.
    """

    role = AgentStepRole.TEMPLATE_FALLBACK

    async def step(self, state: PipelineState) -> Step:
        kept = {draft.persona for draft in state.canonical}
        missing = [p for p in self.agents.canonical_personas if p not in kept]
        templates = self.agents.fallback.drafts(missing, CANONICAL_LOCALE)
        canonical = merge_drafts(self.agents, state.canonical, templates)
        checked = await verify(
            self.agents, state.analysis, canonical, state.draft_attempts, critique=False
        )
        nxt = replace(state, canonical=canonical, verification=checked.result)
        nxt = nxt.with_runs(*checked.runs)
        if checked.verdict is Verdict.PASS:
            return replace(nxt, route=Route.LOCALISE), outcomes.TEMPLATES_PASSED
        suppressed = replace(nxt, canonical=()).with_fallback(reasons.TEMPLATE_FAILED)
        return suppressed.advance(S.REJECTED, Route.FINALISE), outcomes.TEMPLATES_FAILED


class LocalizationExecutor(StepExecutor):
    role = AgentStepRole.LOCALIZATION

    async def step(self, state: PipelineState) -> Step:
        localised, runs = await localise_all(self.agents, state.canonical, self.agents.view.locales)
        used_template = any(run.provider is RunProvider.template for run in runs)
        outcome = outcomes.LOCALE_FALLBACK if used_template else outcomes.LOCALISED
        return replace(state, localised=tuple(localised)).with_runs(*runs), outcome


class ProducerExecutor(StepExecutor):
    role = AgentStepRole.BROADCAST_PRODUCER

    async def step(self, state: PipelineState) -> Step:
        broadcast = next(draft for draft in state.canonical if draft.persona is Persona.BROADCAST)
        use_template = broadcast.source is not NarrativeSource.AGENT
        overlay, runs, reason = await produce(self.agents, broadcast, use_template=use_template)
        nxt = replace(state, overlay=overlay, route=Route.FINALISE).with_runs(*runs)
        if not reason:
            return nxt, outcomes.OVERLAY_TEMPLATE if use_template else outcomes.OVERLAY_READY
        nxt = nxt.with_fallback(reason)
        nxt = nxt if nxt.status is S.FALLBACK else nxt.advance(S.FALLBACK, Route.FINALISE)
        return nxt, outcomes.OVERLAY_FALLBACK


class FinaliseExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[Never, PipelineResult]) -> None:
        if state.fallback_reasons and state.status is S.VERIFIED:
            state = state.advance(S.FALLBACK, Route.FINALISE)
        await ctx.yield_output(build_result(self.agents.view, state, self.agents.recorder.steps))
