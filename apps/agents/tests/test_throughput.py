"""MQ-088: model warm-up, keep-alive validation and the compact prompt mode."""

import json

import httpx
import pytest
from pydantic import SecretStr, ValidationError

from matchiq_agents.contracts.types import AgentName, PipelineStatus
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.models.mock import MockModel
from matchiq_agents.providers.ollama import generate_url, warm_up_ollama
from matchiq_agents.roster.compact import COMPACT_PROMPTS
from matchiq_agents.roster.convert import facts_payload
from matchiq_agents.roster.modes import PromptMode
from matchiq_agents.roster.prompts import PROMPTS
from matchiq_agents.settings import ModelProvider, Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.eval.cases import GOLDEN, EvalCase
from tests.eval.harness import evaluate
from tests.support.builders import build_request
from tests.support.models import FakeClock

OLLAMA = Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.OLLAMA)
COMPACT = Settings(agents_service_token=SecretStr(TOKEN), agent_prompt_mode=PromptMode.COMPACT)


async def test_warm_up_pins_the_model_on_the_native_endpoint() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"done": True})

    assert httpx.URL(generate_url("http://host:11434/v1/")).path == "/api/generate"
    assert await warm_up_ollama(OLLAMA, httpx.MockTransport(handler))
    body = json.loads(seen[0].content)
    assert body["keep_alive"] == "30m"
    assert body["prompt"] == ""
    assert body["model"] == OLLAMA.ollama_model


async def test_warm_up_failure_is_a_warning_not_an_error(caplog: pytest.LogCaptureFixture) -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    assert not await warm_up_ollama(OLLAMA, httpx.MockTransport(refuse))
    assert "warm-up skipped" in caplog.text


@pytest.mark.parametrize("value", ["30m", "1h", "90s", "-1"])
def test_keep_alive_accepts_durations(value: str) -> None:
    settings = Settings(agents_service_token=SecretStr(TOKEN), ollama_keep_alive=value)
    assert settings.ollama_keep_alive == value


@pytest.mark.parametrize("value", ["soon", "30", "-5m", "1d"])
def test_keep_alive_rejects_other_values(value: str) -> None:
    with pytest.raises(ValidationError):
        Settings(agents_service_token=SecretStr(TOKEN), ollama_keep_alive=value)


def test_prompt_mode_defaults_to_standard() -> None:
    assert Settings(agents_service_token=SecretStr(TOKEN)).agent_prompt_mode is PromptMode.STANDARD


def test_compact_prompts_are_smaller_and_keep_the_grounding_rules() -> None:
    for agent, compact in COMPACT_PROMPTS.items():
        standard = PROMPTS[agent]
        assert len(compact.instructions) < len(standard.instructions)
        assert compact.version != standard.version
        grounding = standard.instructions.split("You are")[0]
        assert compact.instructions.startswith(grounding)
    sizes = {a.value: len(p.instructions) for a, p in PROMPTS.items()}
    assert sizes[AgentName.FACT_CHECKER.value] < sizes[AgentName.MATCH_ANALYST.value]


def test_compact_payload_keeps_only_the_first_trend_spell() -> None:
    case = next(c for c in GOLDEN if build_fact_view(build_request(c.spec)).context_metrics)
    view = build_fact_view(build_request(case.spec))
    full = facts_payload(view, context=True)
    small = facts_payload(view, context=True, compact=True)
    assert not {"context.trend.spell2", "context.trend.spell3"} & set(small.computed_metrics)
    assert len(json.dumps(small.model_dump())) <= len(json.dumps(full.model_dump()))
    assert small.event_ids == full.event_ids


@pytest.mark.parametrize("case", GOLDEN, ids=lambda c: c.name)
async def test_compact_mode_passes_the_same_grounding_checks(case: EvalCase) -> None:
    request = build_request(case.spec)
    result = await build_orchestrator(COMPACT, FakeClock(), MockModel()).run(request)
    report = evaluate(case.name, request, result)
    assert report.violations == 0, report
    assert result.status in {PipelineStatus.VERIFIED, PipelineStatus.FALLBACK}
    versions = {run.promptVersion for run in result.runs}
    assert {p.version for p in COMPACT_PROMPTS.values()} & versions
