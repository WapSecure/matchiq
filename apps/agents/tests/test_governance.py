"""Governance additions: content safety, cost estimates, prompt hashes and repairs on traces."""

from collections.abc import Sequence
from dataclasses import replace

import pytest
from pydantic import BaseModel, SecretStr

from matchiq_agents.contracts.types import (
    AgentName,
    IssueCode,
    Locale,
    NarrativeSource,
    PipelineStatus,
    RunProvider,
)
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.guard.checks import check_text
from matchiq_agents.guard.safety import unsafe_categories
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.pricing import Price, PriceTable
from matchiq_agents.models.resilience import CircuitBreaker
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator
from matchiq_agents.roster.prompts import PROMPTS
from matchiq_agents.roster.schemas import WriterOutput
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator, pipeline_config
from tests.conftest import TOKEN
from tests.support.builders import CaseSpec, build_request
from tests.support.models import FakeClock, ScriptedModel

SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))
VIEW = build_fact_view(build_request())


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("Harbour City were useless at the back", "abuse"),
        ("What a shit pass from Harbour City", "profanity"),
        ("Harbour City don dey play like mumu", "abuse"),
        ("Quelle merde, Harbour City", "profanity"),
    ],
)
def test_blocklist_flags_unsafe_broadcast_language(text: str, category: str) -> None:
    assert category in unsafe_categories(text)
    found = check_text(text, [], Locale.en_GB, VIEW, None)
    assert any(f.code is IssueCode.FORBIDDEN_CLAIM for f in found)


@pytest.mark.parametrize(
    "text",
    [
        "Harbour City press high and win the ball back",
        "Match nul pour Harbour City",
        "Harbour City dey press well well",
        "Northgate Rovers keep possession",
    ],
)
def test_blocklist_leaves_ordinary_commentary_alone(text: str) -> None:
    assert unsafe_categories(text) == []


async def test_unsafe_writer_persona_falls_back_without_revision() -> None:
    def insult(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, WriterOutput)
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + ", useless."})
            if d.persona == "CASUAL"
            else d
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    model = ScriptedModel({AgentName.NARRATIVE_WRITER: insult})
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(build_request())
    casual = [d for d in result.narratives if d.persona.value == "CASUAL"]
    assert {d.source for d in casual} == {NarrativeSource.TEMPLATE}
    assert all("useless" not in d.body for d in result.narratives)
    assert model.calls[AgentName.NARRATIVE_WRITER] == 1


class FlaggingScreen:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.seen: list[str] = []

    async def screen(self, texts: Sequence[str], locale: Locale) -> list[list[str]]:
        if self.error is not None:
            raise self.error
        self.seen += texts
        return [
            ["hate"] if "Harbour" in text and index == 0 else [] for index, text in enumerate(texts)
        ]


@pytest.mark.parametrize("error", [None, RuntimeError("screen down")])
async def test_hosted_screen_can_only_remove_agent_copy(error: Exception | None) -> None:
    screen = FlaggingScreen(error)
    clock = FakeClock()
    config = replace(pipeline_config(SETTINGS), safety=screen)
    breaker = CircuitBreaker(clock, failure_threshold=5, reset_ms=30_000)
    orchestrator = PipelineOrchestrator(MockModel(), breaker, clock, config)
    result = await orchestrator.run(build_request())
    assert result.status is PipelineStatus.FALLBACK
    templated = {d.persona for d in result.narratives if d.source is NarrativeSource.TEMPLATE}
    assert templated
    assert error is not None or screen.seen


def test_price_table_is_zero_locally_and_unknown_without_a_price() -> None:
    table = PriceTable({"gpt-x": Price(inputPerMTok=1.0, outputPerMTok=4.0)})
    assert table.estimate(RunProvider.ollama, "ollama/qwen", 1000, 500) == 0.0
    assert table.estimate(RunProvider.foundry, "other", 1000, 500) is None
    assert table.estimate(RunProvider.foundry, "gpt-x", 1_000_000, 500_000) == 3.0


def test_price_table_is_read_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_PRICE_TABLE", '{"gpt-x": {"inputPerMTok": 0.5, "outputPerMTok": 2}}')
    settings = Settings(agents_service_token=SecretStr(TOKEN))
    assert settings.agent_price_table["gpt-x"].output_per_mtok == 2


async def test_runs_record_prompt_hash_cost_and_repairs() -> None:
    def window(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, WriterOutput)
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " in the last 10 minutes."})
            if d.persona == "CASUAL"
            else d
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    spec = CaseSpec(metrics={"highRecoveries.home.rolling10m": 5, "shots.home.rolling10m": 3})
    model = ScriptedModel({AgentName.NARRATIVE_WRITER: window})
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(build_request(spec))
    writer = next(run for run in result.runs if run.agent is AgentName.NARRATIVE_WRITER)
    assert writer.promptHash == PROMPTS[AgentName.NARRATIVE_WRITER].content_hash
    assert writer.repairs is not None
    assert [r.code for r in writer.repairs] == ["DROP_WINDOW"]
    assert writer.costEstimateUsd is None
    casual = next(d for d in result.narratives if d.persona.value == "CASUAL")
    assert casual.source is NarrativeSource.AGENT
    assert "10 minutes" not in casual.body
