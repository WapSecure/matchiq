"""Agent Framework executors: one per roster stage, connected by `workflow.build_workflow`.

Each executor receives the immutable `PipelineState`, performs at most one FSM transition and
sends the new state on. Routing lives in `state.route`, which the workflow's edge conditions read.
"""

import asyncio
from dataclasses import replace
from typing import Never

from agent_framework import Executor, WorkflowContext, handler

from matchiq_agents.contracts.types import (
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
from matchiq_agents.roster.localization import localise
from matchiq_agents.roster.producer import produce
from matchiq_agents.roster.writer import write

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
        drafts, run = await write(self.agents, analysis, state.revision_notes)
        nxt = replace(state, draft_attempts=state.draft_attempts + 1).with_runs(run)
        if drafts is None:
            failed = nxt.with_fallback(reasons.WRITER_FALLBACK)
            await ctx.send_message(failed.advance(S.FALLBACK, Route.FALLBACK))
            return
        drafted = replace(nxt, canonical=tuple(drafts), revision_notes=())
        await ctx.send_message(drafted.advance(S.DRAFTED, Route.VERIFY))


class FactCheckerExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        result, runs = await verify(
            self.agents, state.analysis, state.canonical, state.draft_attempts
        )
        nxt = replace(state, verification=result).with_runs(*runs)
        if result.verdict is Verdict.PASS:
            await ctx.send_message(nxt.advance(S.VERIFIED, Route.LOCALISE))
        elif result.verdict is Verdict.REVISE:
            notes = tuple(found.detail for found in result.issues)
            await ctx.send_message(
                replace(nxt, revision_notes=notes).advance(S.DRAFTED, Route.REVISE)
            )
        else:
            rejected = nxt.with_fallback(reasons.rejected(result.issues))
            await ctx.send_message(rejected.advance(S.FALLBACK, Route.FALLBACK))


class FallbackExecutor(StageExecutor):
    """Swaps in deterministic templates, which are verified like any other draft."""

    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        canonical = tuple(
            self.agents.fallback.drafts(self.agents.canonical_personas, CANONICAL_LOCALE)
        )
        result, runs = await verify(
            self.agents, state.analysis, canonical, state.draft_attempts, critique=False
        )
        nxt = replace(state, canonical=canonical, verification=result).with_runs(*runs)
        if result.verdict is Verdict.PASS:
            await ctx.send_message(replace(nxt, route=Route.LOCALISE))
            return
        suppressed = replace(nxt, canonical=()).with_fallback(reasons.TEMPLATE_FAILED)
        await ctx.send_message(suppressed.advance(S.REJECTED, Route.FINALISE))


class LocalizationExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        use_template = state.status is S.FALLBACK
        results = await asyncio.gather(
            *(
                localise(self.agents, state.canonical, locale, use_template=use_template)
                for locale in self.agents.view.locales
            )
        )
        localised = tuple(draft for drafts, _ in results for draft in drafts)
        runs = tuple(run for _, locale_runs in results for run in locale_runs)
        await ctx.send_message(replace(state, localised=localised).with_runs(*runs))


class ProducerExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[PipelineState]) -> None:
        broadcast = next(draft for draft in state.canonical if draft.persona is Persona.BROADCAST)
        use_template = state.status is S.FALLBACK
        overlay, runs, reason = await produce(self.agents, broadcast, use_template=use_template)
        nxt = replace(state, overlay=overlay, route=Route.FINALISE).with_runs(*runs)
        if reason:
            nxt = nxt.with_fallback(reason).advance(S.FALLBACK, Route.FINALISE)
        await ctx.send_message(nxt)


class FinaliseExecutor(StageExecutor):
    @handler
    async def run(self, state: PipelineState, ctx: WorkflowContext[Never, PipelineResult]) -> None:
        if state.fallback_reasons and state.status is S.VERIFIED:
            state = state.advance(S.FALLBACK, Route.FINALISE)
        await ctx.yield_output(build_result(self.agents.view, state))
