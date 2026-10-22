"""Agent Framework executors: one per roster stage, connected by `workflow.build_workflow`.

Each executor receives the immutable `PipelineState`, performs at most one FSM transition and
sends the new state on. Routing lives in `state.route`, which the workflow's edge conditions read.
"""

from dataclasses import replace
from typing import Never

from agent_framework import Executor, WorkflowContext, handler

from matchiq_agents.contracts.types import (
    NarrativeSource,
    Persona,
    PipelineResult,
    PipelineStatus,
    Verdict,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.result import build_result
from matchiq_agents.pipeline.state import PipelineState, Route
from matchiq_agents.roster.analyst import analyse
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.fact_checker import verify
from matchiq_agents.roster.localization import localise_all
from matchiq_agents.roster.producer import produce
from matchiq_agents.roster.writer import merge_drafts, write

S = PipelineStatus


class StageExecutor(Executor):
    def __init__(self, agents: AgentContext, executor_id: str) -> None:
        super().__init__(id=executor_id)
        self.agents = agents


class AnalystExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        analysis, runs, reason = await analyse(self.agents)
        nxt = replace(state, analysis=analysis).with_runs(*runs)
        nxt = nxt.with_fallback(reason) if reason else nxt
        await ctx.send_message(nxt.advance(S.ANALYZED, Route.VERIFY))


class WriterExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        analysis = state.analysis or self.agents.fallback.analysis()
        personas = state.revision_personas or self.agents.canonical_personas
        drafts, run = await write(self.agents, analysis, state.revision_notes, personas)
        nxt = replace(state, draft_attempts=state.draft_attempts + 1).with_runs(run)
        if drafts is None:
            failed = nxt.with_fallback(reasons.WRITER_FALLBACK)
            await ctx.send_message(failed.advance(S.FALLBACK, Route.FALLBACK))
            return
        canonical = merge_drafts(self.agents, state.canonical, drafts)
        drafted = replace(nxt, canonical=canonical, revision_notes=(), revision_personas=())
        await ctx.send_message(drafted.advance(S.DRAFTED, Route.VERIFY))


class FactCheckerExecutor(StageExecutor):
    """PASS localises; REVISE rewrites only the failing personas; REJECT keeps what passed."""

    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        checked = await verify(self.agents, state.analysis, state.canonical, state.draft_attempts)
        nxt = replace(state, verification=checked.result).with_runs(*checked.runs)
        passing = checked.passing(state.canonical)
        if checked.verdict is Verdict.PASS:
            await ctx.send_message(nxt.advance(S.VERIFIED, Route.LOCALISE))
        elif checked.verdict is Verdict.REVISE:
            revise = replace(
                nxt,
                canonical=passing,
                revision_notes=checked.notes(),
                revision_personas=checked.revisable,
            )
            await ctx.send_message(revise.advance(S.DRAFTED, Route.REVISE))
        else:
            issues = checked.result.issues
            reason = (
                reasons.replaced(checked.failing, issues) if passing else reasons.rejected(issues)
            )
            rejected = replace(nxt, canonical=passing).with_fallback(reason)
            await ctx.send_message(rejected.advance(S.FALLBACK, Route.FALLBACK))


class FallbackExecutor(StageExecutor):
    """Fills every persona without a verified agent draft from deterministic templates.

    The merged set is verified like any other draft set; if it fails, the insight is suppressed.
    """

    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
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
            await ctx.send_message(replace(nxt, route=Route.LOCALISE))
            return
        suppressed = replace(nxt, canonical=()).with_fallback(reasons.TEMPLATE_FAILED)
        await ctx.send_message(suppressed.advance(S.REJECTED, Route.FINALISE))


class LocalizationExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        localised, runs = await localise_all(self.agents, state.canonical, self.agents.view.locales)
        await ctx.send_message(replace(state, localised=tuple(localised)).with_runs(*runs))


class ProducerExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        broadcast = next(draft for draft in state.canonical if draft.persona is Persona.BROADCAST)
        use_template = broadcast.source is not NarrativeSource.AGENT
        overlay, runs, reason = await produce(self.agents, broadcast, use_template=use_template)
        nxt = replace(state, overlay=overlay, route=Route.FINALISE).with_runs(*runs)
        if reason:
            nxt = nxt.with_fallback(reason)
            nxt = nxt if nxt.status is S.FALLBACK else nxt.advance(S.FALLBACK, Route.FINALISE)
        await ctx.send_message(nxt)


class FinaliseExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[Never, PipelineResult]) -> None:
        if state.fallback_reasons and state.status is S.VERIFIED:
            state = state.advance(S.FALLBACK, Route.FINALISE)
        await ctx.yield_output(build_result(self.agents.view, state))
