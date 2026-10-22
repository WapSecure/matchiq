"""Local slow-lane retry policy: per-agent caps, no timeout retries, one feedback retry."""

from collections.abc import Callable, Sequence
from dataclasses import replace

from pydantic import BaseModel, SecretStr

from matchiq_agents.clock import Deadline, SystemClock
from matchiq_agents.contracts.types import AgentName, Issue, IssueCode, RunOutcome
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.guard import messages
from matchiq_agents.guard.checks import issue
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelUsage
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy, StageTimer
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.diagnostics import OutputRejectedError
from matchiq_agents.pipeline.recorder import RunScope
from matchiq_agents.pipeline.runner import ModelCall, ModelRunner
from matchiq_agents.roster.convert import facts_payload
from matchiq_agents.roster.prompts import MATCH_ANALYST
from matchiq_agents.roster.schemas import AnalystInput, AnalystOutput
from matchiq_agents.settings import ModelProvider, Settings
from matchiq_agents.wiring import build_orchestrator, retry_policy
from tests.conftest import TOKEN
from tests.support.builders import build_request
from tests.support.models import FakeClock, HangingModel

VIEW = build_fact_view(build_request())
LOCAL = retry_policy(
    Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.OLLAMA)
)
WINDOW_ISSUE = issue(IssueCode.UNSUPPORTED_NUMBER, messages.UNSUPPORTED_NUMERAL.format(raw="10"))


class Recording(MockModel):
    def __init__(self) -> None:
        self.payloads: list[BaseModel] = []

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        self.payloads.append(payload)
        return await super().generate(agent_name, instructions, payload, response_model, deadline)


def _runner(model: MockModel, clock: FakeClock, policy: RetryPolicy, budget: float = 100_000):
    scope = RunScope(run_id=VIEW.run_id, correlation_id=VIEW.correlation_id)
    breaker = CircuitBreaker(clock, failure_threshold=5, reset_ms=1000)
    return ModelRunner(model, breaker, clock, policy, scope, Deadline.after(clock, budget))


def _call(
    convert: Callable[[AnalystOutput], BaseModel],
    revise: Callable[[Sequence[Issue]], BaseModel] | None = None,
) -> ModelCall[AnalystOutput, BaseModel]:
    return ModelCall(
        prompt=MATCH_ANALYST,
        payload=AnalystInput(facts=facts_payload(VIEW), revision_notes=[]),
        response_model=AnalystOutput,
        convert=convert,
        revise=revise,
    )


def _identity(output: AnalystOutput) -> BaseModel:
    return output


def _revise(issues: Sequence[Issue]) -> BaseModel:
    return AnalystInput(facts=facts_payload(VIEW), revision_notes=[i.detail for i in issues])


def test_local_policy_favours_the_writer_and_caps_the_analyst() -> None:
    shares = LOCAL.agent_shares
    assert shares[AgentName.MATCH_ANALYST] < shares[AgentName.NARRATIVE_WRITER]
    assert shares[AgentName.LOCALIZATION] < shares[AgentName.NARRATIVE_WRITER]
    assert not LOCAL.retry_timeouts
    assert LOCAL.output_retries == 0
    assert LOCAL.feedback_retries == 1


async def test_rejected_output_gets_one_retry_with_the_violation_fed_back() -> None:
    model, attempts = Recording(), list[int]()

    def reject_first(output: AnalystOutput) -> BaseModel:
        attempts.append(1)
        if len(attempts) == 1:
            raise OutputRejectedError("ungrounded", [WINDOW_ISSUE])
        return output

    value, run = await _runner(model, FakeClock(), LOCAL).run(_call(reject_first, _revise))
    assert value is not None
    assert run.retries == 1
    assert run.outcome is RunOutcome.SUCCEEDED
    second = model.payloads[1]
    assert isinstance(second, AnalystInput)
    assert second.revision_notes == [WINDOW_ISSUE.detail]


async def test_no_feedback_retry_without_a_revise_hook_or_issues() -> None:
    def reject(_output: AnalystOutput) -> BaseModel:
        raise OutputRejectedError("ungrounded", [WINDOW_ISSUE])

    _, run = await _runner(Recording(), FakeClock(), LOCAL).run(_call(reject))
    assert run.retries == 0

    def contract_error(_output: AnalystOutput) -> BaseModel:
        raise ValueError("invalid")

    _, run = await _runner(Recording(), FakeClock(), LOCAL).run(_call(contract_error, _revise))
    assert run.retries == 0


async def test_feedback_retry_needs_enough_of_the_deadline_left() -> None:
    clock = FakeClock()

    def slow_reject(_output: AnalystOutput) -> BaseModel:
        clock.advance(60_000)
        raise OutputRejectedError("ungrounded", [WINDOW_ISSUE])

    _, run = await _runner(Recording(), clock, LOCAL).run(_call(slow_reject, _revise))
    assert run.retries == 0


async def test_local_policy_does_not_retry_a_timeout() -> None:
    policy = replace(LOCAL, agent_shares={AgentName.MATCH_ANALYST: 0.01})
    scope = RunScope(run_id=VIEW.run_id, correlation_id=VIEW.correlation_id)
    clock = SystemClock()
    breaker = CircuitBreaker(clock, failure_threshold=5, reset_ms=1000, timeout_threshold=8)
    runner = ModelRunner(
        HangingModel(), breaker, clock, policy, scope, Deadline.after(clock, 30_000)
    )
    _, run = await runner.run(_call(_identity))
    assert run.outcome is RunOutcome.TIMED_OUT
    assert run.retries == 0
    assert run.latencyMs < 1_000


def test_stage_timer_averages_observed_latency() -> None:
    timer = StageTimer(weight=0.5)
    assert timer.estimate(AgentName.MATCH_ANALYST) is None
    timer.observe(AgentName.MATCH_ANALYST, 40_000)
    timer.observe(AgentName.MATCH_ANALYST, 20_000)
    assert timer.estimate(AgentName.MATCH_ANALYST) == 30_000


def test_planning_skips_only_when_the_estimates_do_not_fit() -> None:
    timer = StageTimer()
    clock = FakeClock()
    scope = RunScope(run_id=VIEW.run_id, correlation_id=VIEW.correlation_id)
    breaker = CircuitBreaker(clock, failure_threshold=5, reset_ms=1000)

    def runner(policy: RetryPolicy) -> ModelRunner:
        deadline = Deadline.after(clock, 100_000)
        return ModelRunner(MockModel(), breaker, clock, policy, scope, deadline, timer=timer)

    agents = (AgentName.MATCH_ANALYST, AgentName.NARRATIVE_WRITER)
    assert runner(LOCAL).fits(*agents)
    timer.observe(AgentName.MATCH_ANALYST, 40_000)
    assert runner(LOCAL).fits(*agents)
    timer.observe(AgentName.NARRATIVE_WRITER, 70_000)
    assert not runner(LOCAL).fits(*agents)
    assert runner(replace(LOCAL, plan_stages=False)).fits(*agents)


async def test_skipped_analyst_still_lets_the_writer_draft() -> None:
    timer = StageTimer()
    timer.observe(AgentName.MATCH_ANALYST, 7_000)
    timer.observe(AgentName.NARRATIVE_WRITER, 7_000)
    settings = Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.OLLAMA)
    orchestrator = build_orchestrator(settings, FakeClock(), MockModel(), timer)
    result = await orchestrator.run(build_request())
    assert result.fallbackReason is not None
    assert reasons.ANALYST_SKIPPED in result.fallbackReason
    assert any(d.source.value == "AGENT" for d in result.narratives)
