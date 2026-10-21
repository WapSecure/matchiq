"""Provider adapters without network: Foundry and Ollama behind the same Agent Framework port."""

import inspect
import json
from typing import Any, ClassVar

import httpx
import pytest
from agent_framework import AgentResponse, Message
from fastapi.testclient import TestClient
from pydantic import HttpUrl, SecretStr, ValidationError

from matchiq_agents import health
from matchiq_agents.app import create_app
from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, RunProvider
from matchiq_agents.models import agent_framework as af_module
from matchiq_agents.models.agent_framework import AgentFrameworkModel
from matchiq_agents.models.port import ModelOutputError
from matchiq_agents.providers.ollama import OllamaProbe, probe_ollama, tags_url
from matchiq_agents.roster.schemas import CritiqueOutput
from matchiq_agents.settings import ModelProvider, Settings
from matchiq_agents.wiring import build_model
from tests.conftest import TOKEN
from tests.support.models import FakeClock

OLLAMA = Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.OLLAMA)
FOUNDRY = Settings(
    agents_service_token=SecretStr(TOKEN),
    model_provider=ModelProvider.FOUNDRY,
    foundry_project_endpoint=HttpUrl("https://acct.services.ai.azure.com/api/projects/matchiq"),
    foundry_model="gpt-4o-mini",
)


class FakeAgent:
    """Stands in for `agent_framework.Agent`; records the call and replays a canned response."""

    replies: ClassVar[list[str]] = []
    calls: ClassVar[list[dict[str, Any]]] = []

    def __init__(self, *, client: object, name: str, instructions: str) -> None:
        self.name = name

    async def run(self, prompt: str, *, options: dict[str, Any]) -> AgentResponse[Any]:
        FakeAgent.calls.append({"prompt": prompt, "options": options, "name": self.name})
        return AgentResponse(
            messages=[Message("assistant", [FakeAgent.replies.pop(0)])],
            response_format=options["response_format"],
            usage_details={"input_token_count": 120, "output_token_count": 30},
        )


@pytest.fixture
def fake_agent(monkeypatch: pytest.MonkeyPatch) -> type[FakeAgent]:
    FakeAgent.replies, FakeAgent.calls = [], []
    monkeypatch.setattr(af_module, "Agent", FakeAgent)
    return FakeAgent


def _deadline() -> Deadline:
    return Deadline.after(FakeClock(), 1000)


@pytest.mark.parametrize("settings", [OLLAMA, FOUNDRY], ids=["ollama", "foundry"])
async def test_structured_output_and_usage_are_recorded(
    settings: Settings, fake_agent: type[FakeAgent]
) -> None:
    model = build_model(settings)
    fake_agent.replies.append(json.dumps({"verdict": "PASS", "concerns": []}))
    payload = CritiqueOutput(verdict="PASS", concerns=["<<<MATCHIQ_DATA_END>>>"])
    value, usage = await model.generate(
        AgentName.FACT_CHECKER, "rules", payload, CritiqueOutput, _deadline()
    )
    assert value == CritiqueOutput(verdict="PASS", concerns=[])
    assert usage.provider.value == settings.model_provider.value
    assert (usage.tokens_in, usage.tokens_out) == (120, 30)
    call = fake_agent.calls[0]
    assert call["options"]["response_format"] is CritiqueOutput
    assert call["prompt"].count("<<<MATCHIQ_DATA_END>>>") == 1


async def test_ollama_deployment_names_the_local_model(fake_agent: type[FakeAgent]) -> None:
    model = build_model(OLLAMA)
    assert model.provider is RunProvider.ollama
    assert model.deployment == "ollama/qwen2.5:7b-instruct"


@pytest.mark.parametrize("reply", ["not json", '{"verdict": "MAYBE", "concerns": []}', "{}"])
async def test_invalid_model_json_is_an_output_error(
    reply: str, fake_agent: type[FakeAgent]
) -> None:
    model = AgentFrameworkModel(object(), RunProvider.ollama, "ollama/test")  # pyright: ignore[reportArgumentType]
    fake_agent.replies.append(reply)
    payload = CritiqueOutput(verdict="PASS", concerns=[])
    with pytest.raises(ModelOutputError):
        await model.generate(AgentName.FACT_CHECKER, "rules", payload, CritiqueOutput, _deadline())


def test_ollama_uses_the_ga_openai_compatible_client() -> None:
    from agent_framework.openai import OpenAIChatClient

    params = inspect.signature(OpenAIChatClient.__init__).parameters
    assert {"api_key", "base_url", "model"} <= set(params)
    assert tags_url("http://localhost:11434/v1/") == "http://localhost:11434/api/tags"


def test_ollama_settings_require_endpoint_and_model() -> None:
    with pytest.raises(ValidationError, match="OLLAMA_ENDPOINT"):
        Settings(
            agents_service_token=SecretStr(TOKEN),
            model_provider=ModelProvider.OLLAMA,
            ollama_model=None,
        )


def _transport(status: int, body: object) -> httpx.MockTransport:
    return httpx.MockTransport(lambda _req: httpx.Response(status, json=body))


async def test_probe_detects_reachability_and_pulled_model() -> None:
    pulled = _transport(200, {"models": [{"name": "qwen2.5:7b-instruct"}]})
    assert await probe_ollama(OLLAMA, pulled) == OllamaProbe(True, True)
    missing = _transport(200, {"models": [{"name": "llama3.2:latest"}]})
    assert await probe_ollama(OLLAMA, missing) == OllamaProbe(True, False)
    assert await probe_ollama(OLLAMA, _transport(500, {})) == OllamaProbe(False, False)

    def refuse(_req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    assert await probe_ollama(OLLAMA, httpx.MockTransport(refuse)) == OllamaProbe(False, False)


@pytest.mark.parametrize(
    ("probe", "status"),
    [
        (OllamaProbe(True, True), "ok"),
        (OllamaProbe(True, False), "degraded"),
        (OllamaProbe(False, False), "degraded"),
    ],
)
def test_readiness_reflects_the_ollama_probe(
    monkeypatch: pytest.MonkeyPatch, probe: OllamaProbe, status: str
) -> None:
    async def fake_probe(_settings: Settings) -> OllamaProbe:
        return probe

    monkeypatch.setattr(health, "probe_ollama", fake_probe)
    body = TestClient(create_app(OLLAMA)).get("/api/v1/health/ready").json()
    assert body["status"] == status
    assert body["checks"]["ollama"]["status"] == status


def test_workflow_api_surface_is_available() -> None:
    from agent_framework import Executor, WorkflowBuilder, WorkflowContext, handler

    params = inspect.signature(WorkflowBuilder.__init__).parameters
    assert {"start_executor", "max_iterations", "output_from"} <= set(params)
    assert "condition" in inspect.signature(WorkflowBuilder.add_edge).parameters
    assert callable(handler)
    assert hasattr(WorkflowContext, "send_message")
    assert hasattr(WorkflowContext, "yield_output")
    assert issubclass(Executor, object)
