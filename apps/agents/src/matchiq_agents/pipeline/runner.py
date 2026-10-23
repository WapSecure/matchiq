"""Calls the model port with deadline, retry, backoff and circuit-breaker policy.

A model failure never propagates: the caller receives `None` plus the `AgentRun` that explains it.
"""

import asyncio
import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import datetime

from pydantic import BaseModel

from matchiq_agents.clock import MS_PER_SECOND, Clock, Deadline
from matchiq_agents.contracts.types import AgentName, AgentRun, Issue, RunOutcome
from matchiq_agents.guard.repair import Repair
from matchiq_agents.models.port import ModelOutputError, ModelPort, ModelUsage
from matchiq_agents.models.pricing import EMPTY_PRICES, PriceTable
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy, StageTimer
from matchiq_agents.pipeline import diagnostics
from matchiq_agents.pipeline.budget import RunBudget
from matchiq_agents.pipeline.recorder import RunRecord, RunScope
from matchiq_agents.roster.prompts import Prompt

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ModelCall[T: BaseModel, R]:
    prompt: Prompt
    payload: BaseModel
    response_model: type[T]
    convert: Callable[[T], R]
    # Filled by `convert` with the deterministic repairs it applied to the accepted output.
    repairs: list[Repair] = field(default_factory=list[Repair])
    # Builds the payload for a feedback retry from the issues that rejected the last output.
    revise: Callable[[Sequence[Issue]], BaseModel] | None = None


@dataclass(slots=True)
class _Attempts:
    started_ms: float
    count: int = 0
    rejected: int = 0
    feedback: int = 0
    timed_out: bool = False
    issues: tuple[Issue, ...] = ()
    tokens_in: int | None = None
    tokens_out: int | None = None
    outcome: RunOutcome = RunOutcome.FAILED

    def add_usage(self, usage: ModelUsage) -> None:
        if usage.tokens_in is not None:
            self.tokens_in = (self.tokens_in or 0) + usage.tokens_in
        if usage.tokens_out is not None:
            self.tokens_out = (self.tokens_out or 0) + usage.tokens_out


class ModelRunner:
    def __init__(
        self,
        model: ModelPort,
        breaker: CircuitBreaker,
        clock: Clock,
        policy: RetryPolicy,
        scope: RunScope,
        deadline: Deadline,
        prices: PriceTable = EMPTY_PRICES,
        timer: StageTimer | None = None,
        budget: RunBudget | None = None,
    ) -> None:
        self._budget = budget or RunBudget()
        self._model = model
        self._breaker = breaker
        self._clock = clock
        self._policy = policy
        self._scope = scope
        self._deadline = deadline
        self._prices = prices
        self._timer = timer or StageTimer()
        self._total_ms = deadline.remaining_ms()

    @property
    def scope(self) -> RunScope:
        return self._scope

    @property
    def clock(self) -> Clock:
        return self._clock

    @property
    def deadline(self) -> Deadline:
        return self._deadline

    @property
    def budget(self) -> RunBudget:
        return self._budget

    def fits(self, *agents: AgentName) -> bool:
        """Whether these calls, by their observed latency, fit in the time that is left."""
        if not self._policy.plan_stages:
            return True
        estimates = [self._timer.estimate(agent) for agent in agents]
        known = [estimate for estimate in estimates if estimate is not None]
        if len(known) < len(estimates):
            return True
        return sum(known) <= self._deadline.remaining_ms() - self._policy.reserve_ms

    def _call_budget_ms(self, agent: AgentName) -> float:
        share = self._policy.agent_shares.get(agent, self._policy.per_call_share)
        remaining = self._deadline.remaining_ms() - self._policy.reserve_ms
        return min(remaining, max(self._total_ms * share, self._policy.min_call_ms))

    async def _attempt[T: BaseModel, R](
        self, call: ModelCall[T, R], payload: BaseModel, state: _Attempts
    ) -> R | None:
        """One call. Transport faults and timeouts count toward the breaker; bad output does not."""
        budget_ms = self._call_budget_ms(call.prompt.agent)
        if budget_ms < self._policy.min_call_ms:
            state.outcome = RunOutcome.TIMED_OUT
            self._breaker.release()
            return None
        try:
            async with asyncio.timeout(budget_ms / MS_PER_SECOND):
                parsed, usage = await self._model.generate(
                    call.prompt.agent,
                    call.prompt.instructions,
                    payload,
                    call.response_model,
                    self._deadline,
                )
        except TimeoutError:
            state.outcome = RunOutcome.TIMED_OUT
            state.timed_out = True
            self._breaker.record_timeout()
            self._report(call, diagnostics.TIMEOUT)
            return None
        except ModelOutputError as error:
            state.outcome = RunOutcome.FAILED
            self._breaker.record_failure()
            self._report(call, diagnostics.UNPARSEABLE, str(error))
            return None
        except Exception as error:
            logger.warning("model call failed", extra={"agent": call.prompt.agent.value})
            self._report(call, diagnostics.TRANSPORT, type(error).__name__)
            state.outcome = RunOutcome.FAILED
            self._breaker.record_failure()
            return None
        self._breaker.record_success()
        state.add_usage(usage)
        cost = self._prices.estimate(
            self._model.provider, self._model.deployment, usage.tokens_in, usage.tokens_out
        )
        self._budget.charge(usage.tokens_in, usage.tokens_out, cost)
        return self._convert(call, parsed, state)

    def _convert[T: BaseModel, R](
        self, call: ModelCall[T, R], parsed: T, state: _Attempts
    ) -> R | None:
        call.repairs.clear()
        try:
            value = call.convert(parsed)
        except Exception as error:
            logger.info("model output rejected", extra={"agent": call.prompt.agent.value})
            if isinstance(error, diagnostics.OutputRejectedError):
                state.issues = error.issues
            else:
                self._report(call, diagnostics.CONTRACT_INVALID, type(error).__name__)
            state.outcome = RunOutcome.FAILED
            state.rejected += 1
            return None
        state.outcome = RunOutcome.SUCCEEDED
        return value

    async def run[T: BaseModel, R](self, call: ModelCall[T, R]) -> tuple[R | None, AgentRun]:
        started_at = self._clock.now()
        state = _Attempts(started_ms=self._clock.monotonic_ms())
        value: R | None = None
        payload = call.payload
        for attempt in range(self._policy.max_retries + 1):
            if attempt:
                await self._backoff(attempt)
            if not self._budget.allow() or not self._breaker.allow():
                state.outcome = RunOutcome.FAILED
                break
            state.count = attempt + 1
            value = await self._attempt(call, payload, state)
            if value is not None or self._deadline.expired:
                break
            if state.timed_out and not self._policy.retry_timeouts:
                break
            if state.rejected > self._policy.output_retries and not self._feedback_allowed(
                call, state
            ):
                break
            if state.issues and call.revise is not None:
                payload = call.revise(state.issues)
        if state.outcome in (RunOutcome.SUCCEEDED, RunOutcome.TIMED_OUT) and state.count:
            elapsed_ms = self._clock.monotonic_ms() - state.started_ms
            timed_out = state.outcome is RunOutcome.TIMED_OUT
            self._timer.observe(call.prompt.agent, elapsed_ms, timed_out=timed_out)
        return value, self._scope.record(self._record(call, state, started_at))

    def _feedback_allowed[T: BaseModel, R](self, call: ModelCall[T, R], state: _Attempts) -> bool:
        """One more attempt with the violations fed back, when the call and the time allow."""
        enough_time = (
            self._deadline.remaining_ms() >= self._total_ms * self._policy.feedback_min_share
        )
        allowed = (
            call.revise is not None
            and bool(state.issues)
            and state.feedback < self._policy.feedback_retries
            and enough_time
        )
        if allowed:
            state.feedback += 1
        return allowed

    def _report[T: BaseModel, R](self, call: ModelCall[T, R], rule: str, detail: str = "") -> None:
        diagnostics.report_failure(self._scope.run_id, call.prompt.agent, rule, detail)

    async def _backoff(self, attempt: int) -> None:
        delay = self._policy.backoff_base_ms * 2 ** (attempt - 1)
        await self._clock.sleep_ms(min(delay, max(0.0, self._deadline.remaining_ms())))

    def _record[T: BaseModel, R](
        self, call: ModelCall[T, R], state: _Attempts, started_at: datetime
    ) -> RunRecord:
        return RunRecord(
            agent=call.prompt.agent,
            provider=self._model.provider,
            prompt_version=call.prompt.version,
            started_at=started_at,
            latency_ms=self._clock.monotonic_ms() - state.started_ms,
            outcome=state.outcome,
            retries=max(0, state.count - 1),
            model_deployment=self._model.deployment,
            tokens_in=state.tokens_in,
            tokens_out=state.tokens_out,
            prompt_hash=call.prompt.content_hash,
            cost_estimate_usd=self._prices.estimate(
                self._model.provider, self._model.deployment, state.tokens_in, state.tokens_out
            ),
            repairs=tuple(call.repairs) if state.outcome is RunOutcome.SUCCEEDED else (),
        )
