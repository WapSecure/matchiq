"""Calls the model port with deadline, retry, backoff and circuit-breaker policy.

A model failure never propagates: the caller receives `None` plus the `AgentRun` that explains it.
"""

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel

from matchiq_agents.clock import MS_PER_SECOND, Clock, Deadline
from matchiq_agents.contracts.types import AgentRun, RunOutcome
from matchiq_agents.models.port import ModelPort, ModelUsage
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy
from matchiq_agents.pipeline.recorder import RunRecord, RunScope
from matchiq_agents.roster.prompts import Prompt

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ModelCall[T: BaseModel, R]:
    prompt: Prompt
    payload: BaseModel
    response_model: type[T]
    convert: Callable[[T], R]


@dataclass(slots=True)
class _Attempts:
    started_ms: float
    count: int = 0
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
    ) -> None:
        self._model = model
        self._breaker = breaker
        self._clock = clock
        self._policy = policy
        self._scope = scope
        self._deadline = deadline
        self._call_cap_ms = (deadline.remaining_ms()) * policy.per_call_share

    @property
    def scope(self) -> RunScope:
        return self._scope

    @property
    def clock(self) -> Clock:
        return self._clock

    def _call_budget_ms(self) -> float:
        remaining = self._deadline.remaining_ms() - self._policy.reserve_ms
        return min(remaining, max(self._call_cap_ms, self._policy.min_call_ms))

    async def _attempt[T: BaseModel, R](self, call: ModelCall[T, R], state: _Attempts) -> R | None:
        """One call. Transport faults and timeouts count toward the breaker; bad output does not."""
        budget_ms = self._call_budget_ms()
        if budget_ms < self._policy.min_call_ms:
            state.outcome = RunOutcome.TIMED_OUT
            self._breaker.release()
            return None
        try:
            async with asyncio.timeout(budget_ms / MS_PER_SECOND):
                parsed, usage = await self._model.generate(
                    call.prompt.agent,
                    call.prompt.instructions,
                    call.payload,
                    call.response_model,
                    self._deadline,
                )
        except TimeoutError:
            state.outcome = RunOutcome.TIMED_OUT
            self._breaker.record_timeout()
            return None
        except Exception:
            logger.warning("model call failed", extra={"agent": call.prompt.agent.value})
            state.outcome = RunOutcome.FAILED
            self._breaker.record_failure()
            return None
        self._breaker.record_success()
        state.add_usage(usage)
        return self._convert(call, parsed, state)

    def _convert[T: BaseModel, R](
        self, call: ModelCall[T, R], parsed: T, state: _Attempts
    ) -> R | None:
        try:
            value = call.convert(parsed)
        except Exception:
            logger.info("model output rejected", extra={"agent": call.prompt.agent.value})
            state.outcome = RunOutcome.FAILED
            return None
        state.outcome = RunOutcome.SUCCEEDED
        return value

    async def run[T: BaseModel, R](self, call: ModelCall[T, R]) -> tuple[R | None, AgentRun]:
        started_at = self._clock.now()
        state = _Attempts(started_ms=self._clock.monotonic_ms())
        value: R | None = None
        for attempt in range(self._policy.max_retries + 1):
            if attempt:
                await self._backoff(attempt)
            if not self._breaker.allow():
                state.outcome = RunOutcome.FAILED
                break
            state.count = attempt + 1
            value = await self._attempt(call, state)
            if value is not None or self._deadline.expired:
                break
        return value, self._scope.record(self._record(call, state, started_at))

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
        )
