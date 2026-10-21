from collections.abc import Callable

import pytest
from pydantic import BaseModel

from matchiq_agents.clock import Deadline, SystemClock
from matchiq_agents.contracts.types import PipelineStatus, RunOutcome, RunProvider
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.models.resilience import BreakerState, CircuitBreaker, RetryPolicy
from matchiq_agents.pipeline.fsm import IllegalTransitionError, can_transition, ensure_transition
from matchiq_agents.pipeline.recorder import RunScope
from matchiq_agents.pipeline.runner import ModelCall, ModelRunner
from matchiq_agents.roster.convert import facts_payload
from matchiq_agents.roster.prompts import MATCH_ANALYST
from matchiq_agents.roster.schemas import AnalystOutput
from tests.support.builders import build_request
from tests.support.models import FailingModel, FakeClock, HangingModel

POLICY = RetryPolicy(
    max_retries=2, backoff_base_ms=100, per_call_share=0.5, reserve_ms=50, min_call_ms=200
)
VIEW = build_fact_view(build_request())


def _runner(
    model: ModelPort,
    clock: FakeClock | SystemClock,
    breaker: CircuitBreaker | None = None,
    budget: float = 8000,
) -> ModelRunner:
    scope = RunScope(run_id=VIEW.run_id, correlation_id=VIEW.correlation_id)
    return ModelRunner(
        model,
        breaker or CircuitBreaker(clock, failure_threshold=5, reset_ms=1000),
        clock,
        POLICY,
        scope,
        Deadline.after(clock, budget),
    )


def _identity(output: AnalystOutput) -> BaseModel:
    return output


def _call(
    convert: Callable[[AnalystOutput], BaseModel] = _identity,
) -> ModelCall[AnalystOutput, BaseModel]:
    return ModelCall(
        prompt=MATCH_ANALYST,
        payload=facts_payload(VIEW),
        response_model=AnalystOutput,
        convert=convert,
    )


def test_breaker_opens_after_threshold_and_half_opens_after_reset() -> None:
    clock = FakeClock()
    breaker = CircuitBreaker(clock, failure_threshold=2, reset_ms=1000)
    breaker.record_failure()
    assert breaker.state is BreakerState.CLOSED
    breaker.record_failure()
    assert breaker.state is BreakerState.OPEN
    assert not breaker.allow()
    clock.advance(1000)
    assert breaker.allow()
    assert not breaker.allow()
    breaker.record_failure()
    assert breaker.state is BreakerState.OPEN
    clock.advance(1000)
    assert breaker.allow()
    breaker.record_success()
    assert breaker.state is BreakerState.CLOSED


async def test_success_records_provider_prompt_and_correlation() -> None:
    value, run = await _runner(MockModel(), FakeClock()).run(_call())
    assert isinstance(value, AnalystOutput)
    assert run.outcome is RunOutcome.SUCCEEDED
    assert run.provider is RunProvider.mock
    assert run.promptVersion == MATCH_ANALYST.version
    assert run.correlationId == VIEW.correlation_id
    assert run.retries == 0


async def test_failures_retry_twice_with_exponential_backoff() -> None:
    clock = FakeClock()
    model = FailingModel()
    value, run = await _runner(model, clock).run(_call())
    assert value is None
    assert model.calls == 3
    assert run.retries == 2
    assert run.outcome is RunOutcome.FAILED
    assert clock.sleeps == [100, 200]


async def test_rejected_output_is_retried_but_does_not_trip_the_breaker() -> None:
    clock = FakeClock()
    breaker = CircuitBreaker(clock, failure_threshold=1, reset_ms=1000)

    def reject(_out: AnalystOutput) -> BaseModel:
        raise ValueError("ungrounded")

    value, run = await _runner(MockModel(), clock, breaker).run(_call(reject))
    assert value is None
    assert run.retries == 2
    assert breaker.state is BreakerState.CLOSED


async def test_open_breaker_fails_fast_without_calling_the_model() -> None:
    clock = FakeClock()
    breaker = CircuitBreaker(clock, failure_threshold=1, reset_ms=1000)
    breaker.record_failure()
    model = FailingModel()
    value, run = await _runner(model, clock, breaker).run(_call())
    assert value is None
    assert model.calls == 0
    assert run.outcome is RunOutcome.FAILED


async def test_hanging_model_times_out_within_the_deadline() -> None:
    clock = SystemClock()
    model = HangingModel()
    started = clock.monotonic_ms()
    value, run = await _runner(model, clock, budget=900).run(_call())
    assert value is None
    assert run.outcome is RunOutcome.TIMED_OUT
    assert clock.monotonic_ms() - started < 1500


def test_fsm_allows_only_spec_transitions() -> None:
    s = PipelineStatus
    assert can_transition(s.DETECTED, s.ANALYZED)
    assert can_transition(s.DRAFTED, s.DRAFTED)
    assert can_transition(s.VERIFIED, s.FALLBACK)
    assert not can_transition(s.DETECTED, s.VERIFIED)
    assert not can_transition(s.VERIFIED, s.SCHEDULED)
    with pytest.raises(IllegalTransitionError):
        ensure_transition(s.REJECTED, s.VERIFIED)
