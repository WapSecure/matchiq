"""Entry point for one pipeline run. Always returns a valid `PipelineResult`; never raises."""

import asyncio
import logging
from dataclasses import dataclass

from matchiq_agents.clock import MS_PER_SECOND, Clock, Deadline
from matchiq_agents.contracts.types import (
    PipelineRequest,
    PipelineResult,
    PipelineStatus,
    Verdict,
    VerificationResult,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, build_fact_view, integrity_problems
from matchiq_agents.guard.safety import ContentSafetyScreen
from matchiq_agents.models.port import ModelPort
from matchiq_agents.models.pricing import EMPTY_PRICES, PriceTable
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy, StageTimer
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.recorder import RunScope
from matchiq_agents.pipeline.result import build_result, rejected_result
from matchiq_agents.pipeline.runner import ModelRunner
from matchiq_agents.pipeline.state import PipelineState, Route
from matchiq_agents.pipeline.workflow import build_workflow
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.fact_checker import decide, deterministic_issues
from matchiq_agents.roster.localization import localise_all
from matchiq_agents.templates.fallback import TemplateFallback

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class PipelineConfig:
    retry: RetryPolicy
    critique_enabled: bool
    grace_ms: float
    prices: PriceTable = EMPTY_PRICES
    safety: ContentSafetyScreen | None = None


class PipelineOrchestrator:
    def __init__(
        self,
        model: ModelPort,
        breaker: CircuitBreaker,
        clock: Clock,
        config: PipelineConfig,
        timer: StageTimer | None = None,
    ) -> None:
        self._timer = timer or StageTimer()
        self._model = model
        self._breaker = breaker
        self._clock = clock
        self._config = config

    @property
    def model(self) -> ModelPort:
        return self._model

    def _agents(self, request: PipelineRequest) -> AgentContext:
        view = build_fact_view(request)
        # Model work stops `grace_ms` early so cancellation and templates still fit inside
        # `deadlineMs`; the worker's HTTP timeout is only slightly longer than the deadline.
        deadline = Deadline.after(self._clock, max(0.0, view.deadline_ms - self._config.grace_ms))
        scope = RunScope(run_id=view.run_id, correlation_id=view.correlation_id)
        runner = ModelRunner(
            self._model,
            self._breaker,
            self._clock,
            self._config.retry,
            scope,
            deadline,
            self._config.prices,
            self._timer,
        )
        return AgentContext(
            view,
            runner,
            TemplateFallback(view),
            self._config.critique_enabled,
            self._config.safety,
        )

    async def run(self, request: PipelineRequest) -> PipelineResult:
        agents = self._agents(request)
        problems = integrity_problems(request)
        if problems:
            return rejected_result(agents.view, problems)
        budget_s = agents.view.deadline_ms / MS_PER_SECOND
        try:
            async with asyncio.timeout(budget_s):
                outcome = await build_workflow(agents).run(PipelineState())
            results = [out for out in outcome.get_outputs() if isinstance(out, PipelineResult)]
            if results:
                return results[-1]
        except Exception:
            logger.exception("pipeline workflow failed", extra={"runId": agents.view.run_id})
        return await emergency_result(agents)


async def emergency_result(agents: AgentContext) -> PipelineResult:
    """Template-only result used when the workflow itself fails or overruns its deadline."""
    fallback = agents.fallback
    canonical = fallback.drafts(agents.canonical_personas, CANONICAL_LOCALE)
    issues = deterministic_issues(agents, None, canonical)
    verification = VerificationResult(verdict=decide(issues, attempt=1), issues=issues)
    state = PipelineState(
        status=PipelineStatus.FALLBACK,
        route=Route.FINALISE,
        analysis=fallback.analysis(),
        verification=verification,
        fallback_reasons=(reasons.ORCHESTRATION_ERROR,),
    )
    if verification.verdict is not Verdict.PASS:
        return build_result(agents.view, state.advance(PipelineStatus.REJECTED, Route.FINALISE))
    localised, runs = await localise_all(agents, canonical, agents.view.locales)
    final = PipelineState(
        status=state.status,
        route=state.route,
        analysis=state.analysis,
        verification=verification,
        localised=tuple(localised),
        overlay=fallback.overlay(),
        fallback_reasons=state.fallback_reasons,
        runs=runs,
    )
    return build_result(agents.view, final)
