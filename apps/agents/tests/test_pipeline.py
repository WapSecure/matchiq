import time
from typing import Any

import pytest
from pydantic import BaseModel, SecretStr

from matchiq_agents.clock import SystemClock
from matchiq_agents.contracts.types import (
    AgentName,
    NarrativeSource,
    PipelineRequest,
    PipelineStatus,
    RunOutcome,
    RunProvider,
    Verdict,
)
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort, ModelUsage
from matchiq_agents.pipeline import orchestrator as orchestrator_module
from matchiq_agents.roster.convert import facts_payload
from matchiq_agents.roster.schemas import (
    CritiqueOutput,
    LocalizationOutput,
    WriterInput,
    WriterOutput,
)
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.support.builders import AWAY, CaseSpec, build_payload, build_request
from tests.support.models import FailingModel, FakeClock, HangingModel, ScriptedModel

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
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " with nine goals."})
            for d in answer.drafts
        ]
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


def _break_persona(persona: str, *, always: bool) -> Any:
    def override(answer: BaseModel, count: int) -> BaseModel | Exception | None:
        assert isinstance(answer, WriterOutput)
        if count > 1 and not always:
            return None
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " with nine goals."})
            if d.persona == persona
            else d
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    return override


class RecordingModel(ScriptedModel):
    """Remembers each writer payload so tests can see which personas a revision asked for."""

    def __init__(self, overrides: Any) -> None:
        super().__init__(overrides)
        self.writer_personas: list[list[str]] = []

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Any,
    ) -> tuple[T, ModelUsage]:
        if isinstance(payload, WriterInput):
            self.writer_personas.append([p.value for p in payload.personas])
        return await super().generate(agent_name, instructions, payload, response_model, deadline)


async def test_revision_asks_only_for_the_failing_persona() -> None:
    model = RecordingModel({AgentName.NARRATIVE_WRITER: _break_persona("CASUAL", always=False)})
    result = await _run(model)
    assert result.status is PipelineStatus.VERIFIED
    assert model.writer_personas == [["CASUAL", "ANALYST", "BROADCAST"], ["CASUAL"]]
    assert {d.source for d in result.narratives} == {NarrativeSource.AGENT}


async def test_a_persona_that_keeps_failing_falls_back_alone() -> None:
    model = ScriptedModel({AgentName.NARRATIVE_WRITER: _break_persona("ANALYST", always=True)})
    result = await _run(model)
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason is not None
    assert "replaced ANALYST" in result.fallbackReason
    sources = {(d.persona.value, d.source) for d in result.narratives}
    assert ("ANALYST", NarrativeSource.TEMPLATE) in sources
    assert ("CASUAL", NarrativeSource.AGENT) in sources
    assert ("BROADCAST", NarrativeSource.AGENT) in sources
    assert result.overlay is not None


async def test_localization_is_one_call_and_falls_back_per_item() -> None:
    def break_french_casual(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, LocalizationOutput)
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " 99."})
            if (d.locale, d.persona) == ("fr-FR", "CASUAL")
            else d
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    model = ScriptedModel({AgentName.LOCALIZATION: break_french_casual})
    result = await _run(model)
    assert model.calls[AgentName.LOCALIZATION] == 1
    by_variant = {(d.locale.value, d.persona.value): d for d in result.narratives}
    assert by_variant[("fr-FR", "CASUAL")].source is NarrativeSource.TEMPLATE
    assert by_variant[("fr-FR", "ANALYST")].source is NarrativeSource.AGENT
    assert by_variant[("pcm-NG", "CASUAL")].source is NarrativeSource.AGENT
    assert len(result.narratives) == 12


def _drop_non_casual(*, always: bool, seen: list[int]):
    def override(answer: BaseModel, count: int) -> BaseModel | Exception | None:
        assert isinstance(answer, LocalizationOutput)
        seen.append(len(answer.drafts))
        if count > 1 and not always:
            return None
        drafts = [d for d in answer.drafts if d.persona == "CASUAL"]
        return answer.model_copy(update={"drafts": drafts}) if drafts else ValueError("empty")

    return override


async def test_left_out_localization_items_are_requested_once_more() -> None:
    seen: list[int] = []
    model = ScriptedModel({AgentName.LOCALIZATION: _drop_non_casual(always=False, seen=seen)})
    result = await _run(model)
    assert model.calls[AgentName.LOCALIZATION] == 2
    # The follow-up asks only for the 6 ANALYST and BROADCAST items the first call left out.
    assert seen == [9, 6]
    assert len(result.narratives) == 12
    assert {d.source for d in result.narratives} == {NarrativeSource.AGENT}
    assert not any(d.localeFallback for d in result.narratives)


async def test_items_still_missing_after_the_follow_up_fall_back_per_item() -> None:
    seen: list[int] = []
    model = ScriptedModel({AgentName.LOCALIZATION: _drop_non_casual(always=True, seen=seen)})
    result = await _run(model)
    assert seen[:2] == [9, 6]
    by_variant = {(d.locale.value, d.persona.value): d for d in result.narratives}
    assert by_variant[("fr-FR", "CASUAL")].source is NarrativeSource.AGENT
    for locale in ("fr-FR", "es-ES", "pcm-NG"):
        for persona in ("ANALYST", "BROADCAST"):
            draft = by_variant[(locale, persona)]
            assert draft.source is NarrativeSource.TEMPLATE or draft.localeFallback
    assert len(result.narratives) == 12


async def test_local_inference_makes_four_model_calls_per_clean_run() -> None:
    local = Settings(agents_service_token=SecretStr(TOKEN), agent_critique_enabled=False)
    model = ScriptedModel()
    await build_orchestrator(local, FakeClock(), model).run(build_request())
    assert sum(model.calls.values()) == 4
    assert AgentName.FACT_CHECKER not in model.calls


def test_data_blocks_carry_teams_and_subject_not_the_squad() -> None:
    view = build_fact_view(build_request(CaseSpec(squad_players=36)))
    assert len(view.entity_names) == 39
    assert facts_payload(view).entities == ["Harbour City", "Northgate Rovers"]
    trimmed = facts_payload(view, free_text=False, metric_refs={"shots.home.rolling5m"})
    assert trimmed.computed_metrics == {"shots.home.rolling5m": 3}
    assert (trimmed.rationale, trimmed.counter_evidence) == ("", [])


async def test_a_hanging_model_still_answers_inside_the_deadline() -> None:
    started = time.perf_counter()
    orchestrator = build_orchestrator(SETTINGS, SystemClock(), HangingModel())
    result = await orchestrator.run(build_request(CaseSpec(deadline_ms=1_500)))
    assert (time.perf_counter() - started) * 1_000 < 1_500
    assert result.status is PipelineStatus.FALLBACK
    assert {d.source for d in result.narratives} == {NarrativeSource.TEMPLATE}
