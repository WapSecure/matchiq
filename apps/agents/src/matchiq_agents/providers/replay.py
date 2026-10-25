"""Replays one recorded moment through the real roster stages (provider `recorded`, ADR-0042).

Only the model calls are replaced by recorded output. The Fact Checker, the template fallback,
the per-item localisation checks, the overlay checks and the step recorder are the live ones, so
a recorded draft that no longer matches this session's numbers is rejected and the template airs.
"""

from dataclasses import replace
from datetime import timedelta

from pydantic import ValidationError

from matchiq_agents.constants import RECORDED_DEPLOYMENT_PREFIX
from matchiq_agents.contracts.types import (
    AgentName,
    AgentRun,
    AgentStepRole,
    Locale,
    NarrativeDraft,
    NarrativeSource,
    OverlayProposal,
    Persona,
    PipelineResult,
    PipelineStatus,
    RunOutcome,
    RunProvider,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.guard.checks import check_overlay
from matchiq_agents.guard.locale_checks import check_localised
from matchiq_agents.guard.repair import Repair
from matchiq_agents.limits import MAX_DRAFT_ATTEMPTS
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline import step_reasons as outcomes
from matchiq_agents.pipeline.executors import FactCheckerExecutor, FallbackExecutor
from matchiq_agents.pipeline.recorder import RunRecord
from matchiq_agents.pipeline.result import build_result
from matchiq_agents.pipeline.state import PipelineState, Route
from matchiq_agents.pipeline.steps import StepOutcome, Work
from matchiq_agents.providers.recording import RecordedMoment, RecordedNarrative, RecordedRun
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import to_overlay
from matchiq_agents.roster.localization import fallback_item, serve_original

S = PipelineStatus
Step = tuple[PipelineState, StepOutcome]


class Replay:
    def __init__(self, ctx: AgentContext, moment: RecordedMoment) -> None:
        self._ctx = ctx
        self._moment = moment
        self._deployment = f"{RECORDED_DEPLOYMENT_PREFIX}{moment.source.model}"
        self._cursor = ctx.runner.clock.now()

    def _runs(self, agent: AgentName) -> tuple[AgentRun, ...]:
        """Recorded runs of one agent. Template runs of the recording are not carried over:
        what the templates did in this session is recorded by the live stages instead."""
        made: list[AgentRun] = []
        for run in self._moment.runs_of(agent):
            if run.provider != "ollama":
                continue
            made.append(self._ctx.runner.scope.record(self._record(run)))
            self._cursor += timedelta(milliseconds=run.latency_ms)
        return tuple(made)

    def _record(self, run: RecordedRun) -> RunRecord:
        return RunRecord(
            agent=run.agent,
            provider=RunProvider.recorded,
            prompt_version=run.prompt_version,
            started_at=self._cursor,
            latency_ms=run.latency_ms,
            outcome=run.outcome,
            retries=run.retries,
            model_deployment=self._deployment,
            tokens_in=run.tokens_in,
            tokens_out=run.tokens_out,
            prompt_hash=run.prompt_hash,
            repairs=tuple(Repair(item.code, item.detail) for item in run.repairs),
        )

    def _recorded_ms(self, agent: AgentName) -> int:
        return sum(
            run.latency_ms for run in self._moment.runs_of(agent) if run.provider == "ollama"
        )

    async def _step(
        self, role: AgentStepRole, state: PipelineState, work: Work, agent: AgentName | None = None
    ) -> PipelineState:
        recorder = self._ctx.recorder
        after = await recorder.record(role, state, work)
        if agent is not None and recorder.steps:
            step = recorder.steps[-1]
            recorder.steps[-1] = step.model_copy(update={"latencyMs": self._recorded_ms(agent)})
        return after

    async def run(self) -> PipelineResult:
        ctx = self._ctx
        state = await self._step(
            AgentStepRole.MATCH_ANALYST, PipelineState(), self._analyst, AgentName.MATCH_ANALYST
        )
        state = await self._step(
            AgentStepRole.NARRATIVE_WRITER, state, self._writer, AgentName.NARRATIVE_WRITER
        )
        if state.route is Route.VERIFY:
            state = await self._step(
                AgentStepRole.FACT_CHECKER, state, FactCheckerExecutor(ctx, "recorded_checker").step
            )
        if state.route is Route.FALLBACK:
            state = await self._step(
                AgentStepRole.TEMPLATE_FALLBACK, state, FallbackExecutor(ctx, "recorded_fb").step
            )
        if state.route is Route.LOCALISE:
            state = await self._step(
                AgentStepRole.LOCALIZATION, state, self._localisation, AgentName.LOCALIZATION
            )
            state = await self._step(
                AgentStepRole.BROADCAST_PRODUCER,
                state,
                self._producer,
                AgentName.BROADCAST_PRODUCER,
            )
        if state.fallback_reasons and state.status is S.VERIFIED:
            state = state.advance(S.FALLBACK, Route.FINALISE)
        return build_result(ctx.view, state, ctx.recorder.steps)

    async def _analyst(self, state: PipelineState) -> Step:
        runs = self._runs(AgentName.MATCH_ANALYST)
        nxt = state.with_runs(*runs)
        if any(run.outcome is not RunOutcome.SUCCEEDED for run in runs) or not runs:
            nxt = nxt.with_fallback(reasons.ANALYST_FALLBACK)
            return nxt.advance(S.ANALYZED, Route.VERIFY), outcomes.ANALYST_FALLBACK
        return nxt.advance(S.ANALYZED, Route.VERIFY), outcomes.GROUNDED

    async def _writer(self, state: PipelineState) -> Step:
        drafts = [
            draft
            for persona in self._ctx.canonical_personas
            if (draft := self._canonical(persona)) is not None
        ]
        nxt = replace(state, draft_attempts=MAX_DRAFT_ATTEMPTS).with_runs(
            *self._runs(AgentName.NARRATIVE_WRITER)
        )
        if not drafts:
            failed = nxt.with_fallback(reasons.WRITER_FALLBACK)
            return failed.advance(S.FALLBACK, Route.FALLBACK), outcomes.WRITER_FALLBACK
        # Recorded drafts cannot be rewritten, so the Fact Checker's attempt budget is spent.
        drafted = replace(nxt, canonical=tuple(drafts))
        return drafted.advance(S.DRAFTED, Route.VERIFY), outcomes.DRAFTED

    def _canonical(self, persona: Persona) -> NarrativeDraft | None:
        recorded = self._moment.narrative(persona, CANONICAL_LOCALE)
        if recorded is None:
            return None
        try:
            return NarrativeDraft.model_validate(
                {
                    "persona": persona,
                    "locale": CANONICAL_LOCALE,
                    "headline": recorded.headline,
                    "body": recorded.body,
                    "evidenceEventIds": recorded.evidence_event_ids,
                    "citedValues": [
                        {"metricRef": cited.metric_ref, "value": cited.value}
                        for cited in recorded.cited_values
                    ],
                    "source": NarrativeSource.AGENT,
                    "localeFallback": False,
                }
            )
        except ValidationError:
            return None

    async def _localisation(self, state: PipelineState) -> Step:
        ctx = self._ctx
        sources = [d for d in state.canonical if d.persona in ctx.view.personas]
        localised: list[NarrativeDraft] = []
        used_template = False
        for locale in ctx.view.locales:
            if locale is CANONICAL_LOCALE:
                localised += sources
                continue
            for source in sources:
                draft = self._translated(source, locale)
                if draft is None:
                    draft, used_template = fallback_item(ctx, source, locale), True
                localised.append(draft)
        runs = self._runs(AgentName.LOCALIZATION)
        if used_template:
            runs = (*runs, ctx.local_run(AgentName.LOCALIZATION))
        nxt = replace(state, localised=tuple(localised)).with_runs(*runs)
        return nxt, outcomes.LOCALE_FALLBACK if used_template else outcomes.LOCALISED

    def _translated(self, source: NarrativeDraft, locale: Locale) -> NarrativeDraft | None:
        recorded = self._moment.narrative(source.persona, locale)
        if recorded is None or source.source is not NarrativeSource.AGENT:
            return None
        if recorded.locale_fallback:
            return serve_original(source, locale)
        return self._checked(source, recorded)

    def _checked(
        self, source: NarrativeDraft, recorded: RecordedNarrative
    ) -> NarrativeDraft | None:
        try:
            target = NarrativeDraft.model_validate(
                {
                    **source.model_dump(),
                    "locale": recorded.locale,
                    "headline": recorded.headline,
                    "body": recorded.body,
                }
            )
        except ValidationError:
            return None
        return None if check_localised(source, target, self._ctx.view) else target

    async def _producer(self, state: PipelineState) -> Step:
        ctx = self._ctx
        broadcast = next(d for d in state.canonical if d.persona is Persona.BROADCAST)
        if broadcast.source is not NarrativeSource.AGENT:
            nxt = replace(state, overlay=ctx.fallback.overlay(), route=Route.FINALISE)
            runs = (ctx.local_run(AgentName.BROADCAST_PRODUCER),)
            return nxt.with_runs(*runs), outcomes.OVERLAY_TEMPLATE
        overlay = self._overlay()
        runs = self._runs(AgentName.BROADCAST_PRODUCER)
        if overlay is not None:
            return replace(state, overlay=overlay, route=Route.FINALISE).with_runs(*runs), (
                outcomes.OVERLAY_READY
            )
        template_run = ctx.local_run(AgentName.BROADCAST_PRODUCER)
        nxt = replace(state, overlay=ctx.fallback.overlay(), route=Route.FINALISE)
        nxt = nxt.with_runs(*runs, template_run).with_fallback(reasons.PRODUCER_FALLBACK)
        nxt = nxt if nxt.status is S.FALLBACK else nxt.advance(S.FALLBACK, Route.FINALISE)
        return nxt, outcomes.OVERLAY_FALLBACK

    def _overlay(self) -> OverlayProposal | None:
        recorded = self._moment.overlay
        if recorded is None:
            return None
        try:
            overlay = to_overlay(
                recorded.headline, recorded.body, recorded.metric_refs, self._ctx.view
            )
        except ValidationError:
            return None
        return None if check_overlay(overlay, self._ctx.view) else overlay
