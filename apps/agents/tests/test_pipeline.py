from typing import Any

import pytest
from pydantic import BaseModel, SecretStr

from matchiq_agents.contracts.types import (
    AgentName,
    NarrativeSource,
    PipelineRequest,
    PipelineStatus,
    RunOutcome,
    RunProvider,
    Verdict,
)
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.pipeline import orchestrator as orchestrator_module
from matchiq_agents.roster.schemas import CritiqueOutput, WriterOutput
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.support.builders import AWAY, CaseSpec, build_payload, build_request
from tests.support.models import FailingModel, FakeClock, ScriptedModel

SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))


async def _run(
    model: ModelPort, spec: CaseSpec | None = None, payload: dict[str, Any] | None = None
):

    request = PipelineRequest.model_validate(payload) if payload else build_request(spec)
    return await build_orchestrator(SETTINGS, FakeClock(), model).run(request)


async def test_happy_path_walks_every_stage_of_the_roster() -> None:
    result = await _run(MockModel())
    assert result.status is PipelineStatus.VERIFIED
    assert result.fallbackReason is None
    assert result.verification is not None
    assert result.verification.verdict is Verdict.PASS
    agents = [run.agent for run in result.runs]
    assert agents[:2] == [AgentName.MATCH_ANALYST, AgentName.NARRATIVE_WRITER]
    assert {AgentName.FACT_CHECKER, AgentName.LOCALIZATION, AgentName.BROADCAST_PRODUCER} <= set(
        agents
    )
    assert all(run.correlationId == result.correlationId for run in result.runs)
    assert len(result.narratives) == 12
    assert result.overlay is not None
    assert 6_000 <= result.overlay.durationMs <= 10_000


async def test_revise_regenerates_once_then_passes() -> None:
    def bad_first(answer: BaseModel, count: int) -> BaseModel | None:
        assert isinstance(answer, WriterOutput)
        if count > 1:
            return None
        drafts = [d.model_copy(update={"body": d.body + " Nine goals."}) for d in answer.drafts]
        return answer.model_copy(update={"drafts": drafts})

    result = await _run(ScriptedModel({AgentName.NARRATIVE_WRITER: bad_first}))
    assert result.status is PipelineStatus.VERIFIED
    writer_runs = [run for run in result.runs if run.agent is AgentName.NARRATIVE_WRITER]
    assert len(writer_runs) == 2
    assert all(d.source is NarrativeSource.AGENT for d in result.narratives)


async def test_ai_critique_can_request_a_revision() -> None:
    def critic(answer: BaseModel, count: int) -> BaseModel | None:
        return CritiqueOutput(verdict="REVISE", concerns=["overstates"]) if count == 1 else None

    result = await _run(ScriptedModel({AgentName.FACT_CHECKER: critic}))
    assert result.status is PipelineStatus.VERIFIED
    assert sum(run.agent is AgentName.NARRATIVE_WRITER for run in result.runs) == 2


async def test_model_outage_serves_verified_templates() -> None:
    result = await _run(FailingModel())
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason
    assert result.verification is not None
    assert result.verification.verdict is Verdict.PASS
    assert {d.source for d in result.narratives} == {NarrativeSource.TEMPLATE}
    assert result.analysis is not None
    providers = {(run.provider, run.outcome) for run in result.runs}
    assert (RunProvider.foundry, RunOutcome.FAILED) in providers
    assert (RunProvider.template, RunOutcome.FALLBACK) in providers


async def test_inconsistent_packet_is_suppressed() -> None:
    payload = build_payload(CaseSpec())
    payload["packet"]["insight"]["teamId"] = "tm_unknown"
    result = await _run(MockModel(), payload=payload)
    assert result.status is PipelineStatus.REJECTED
    assert result.narratives == []
    assert result.overlay is None
    assert result.fallbackReason is not None
    assert result.fallbackReason.startswith("suppressed")


async def test_workflow_crash_still_returns_a_valid_result(monkeypatch: pytest.MonkeyPatch) -> None:
    def explode(_agents: object) -> object:
        raise RuntimeError("graph construction failed")

    monkeypatch.setattr(orchestrator_module, "build_workflow", explode)
    result = await _run(MockModel())
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason == "orchestration error; template output"
    assert result.narratives
    assert result.overlay is not None


async def test_only_requested_personas_and_locales_are_returned() -> None:
    result = await _run(MockModel(), CaseSpec(personas=("CASUAL",), locales=("es-ES",)))
    assert [(d.persona.value, d.locale.value) for d in result.narratives] == [("CASUAL", "es-ES")]
    assert result.overlay is not None


async def test_away_team_subject_is_named() -> None:
    result = await _run(
        MockModel(), CaseSpec(team_id=AWAY, metrics={"pressures.away.rolling10m": 14})
    )
    assert all(
        "Northgate Rovers" in d.body for d in result.narratives if d.persona.value == "CASUAL"
    )
