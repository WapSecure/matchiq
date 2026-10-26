"""Provider `recorded` (ADR-0042): replay of earlier real output through the live checks."""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError

from matchiq_agents.app import create_app
from matchiq_agents.constants import RECORDING_FORMAT_VERSION
from matchiq_agents.contracts.types import (
    AgentName,
    Locale,
    NarrativeSource,
    Persona,
    PipelineRequest,
    PipelineResult,
    PipelineStatus,
    RunProvider,
)
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.pipeline.orchestrator import PipelineService
from matchiq_agents.providers.recorded import RecordedService, load_recordings
from matchiq_agents.providers.recording import RecordingError, key_for
from matchiq_agents.settings import AppEnvironment, ModelProvider, Settings
from matchiq_agents.templates.fallback import TemplateFallback
from matchiq_agents.wiring import build_orchestrator, build_service
from tests.conftest import TOKEN
from tests.support.builders import CaseSpec, build_request
from tests.support.models import FakeClock

MODEL = "qwen2.5:7b-instruct"
RECORDED_MS = {
    AgentName.MATCH_ANALYST: 1200,
    AgentName.NARRATIVE_WRITER: 900,
    AgentName.LOCALIZATION: 700,
    AgentName.BROADCAST_PRODUCER: 400,
}
NO_RECORDING = "no recording for this moment"


def settings_for(directory: Path | None, latency_ms: int = 0) -> Settings:
    return Settings(
        agents_service_token=SecretStr(TOKEN),
        model_provider=ModelProvider.RECORDED,
        recorded_dir=directory,
        recorded_latency_ms=latency_ms,
    )


def recording_for(request: PipelineRequest) -> dict[str, Any]:
    """A recording whose wording is the template's: valid text, so any failure is the replay's."""
    view = build_fact_view(request)
    fallback = TemplateFallback(view)
    narratives: list[dict[str, Any]] = []
    for locale in view.locales:
        for persona in view.personas:
            draft = fallback.draft(persona, locale)
            cited = [c.model_dump() for c in draft.citedValues] if locale is Locale.en_GB else []
            narratives.append(
                {
                    "persona": persona.value,
                    "locale": locale.value,
                    "headline": draft.headline,
                    "body": draft.body,
                    "evidenceEventIds": [e.root for e in draft.evidenceEventIds],
                    "citedValues": cited,
                    "localeFallback": False,
                }
            )
    overlay = fallback.overlay()
    return {
        "formatVersion": RECORDING_FORMAT_VERSION,
        "templateId": "fx_comeback_42",
        "exportedWith": "tests",
        "note": "test",
        "moments": [
            {
                "key": key_for(request, view).model_dump(mode="json", by_alias=True),
                "source": {
                    "session": "fx_comeback_42_s7",
                    "model": MODEL,
                    "recordedOn": "2026-10-23",
                },
                "narratives": narratives,
                "overlay": {
                    "headline": overlay.headline,
                    "body": overlay.body,
                    "metricRefs": [r.root for r in overlay.metricRefs],
                },
                "runs": [
                    {
                        "agent": agent.value,
                        "provider": "ollama",
                        "outcome": "SUCCEEDED",
                        "latencyMs": ms,
                        "retries": 0,
                        "promptVersion": "2.0.0",
                        "tokensIn": 100,
                        "tokensOut": 50,
                    }
                    for agent, ms in RECORDED_MS.items()
                ],
            }
        ],
    }


def write(directory: Path, document: dict[str, Any], name: str = "t.json") -> Path:
    directory.mkdir(exist_ok=True)
    (directory / name).write_text(json.dumps(document))
    return directory


@pytest.fixture
def request_() -> PipelineRequest:
    return build_request(CaseSpec())


@pytest.fixture
def service(tmp_path: Path, request_: PipelineRequest) -> PipelineService:
    return build_service(settings_for(write(tmp_path, recording_for(request_))), FakeClock())


async def test_a_recorded_moment_is_replayed_and_labelled_recorded(
    service: PipelineService, request_: PipelineRequest
) -> None:
    result = await service.run(request_)
    assert PipelineResult.model_validate(result.model_dump(mode="json")).status is (
        PipelineStatus.VERIFIED
    )
    assert result.fallbackReason is None
    assert all(n.source is NarrativeSource.AGENT for n in result.narratives)
    by_agent = {run.agent: run for run in result.runs}
    for agent in RECORDED_MS:
        assert by_agent[agent].provider is RunProvider.recorded
        assert by_agent[agent].modelDeployment == f"recorded/{MODEL}"
        assert by_agent[agent].latencyMs == RECORDED_MS[agent]
    assert by_agent[AgentName.FACT_CHECKER].provider is RunProvider.template
    assert not any(run.provider in (RunProvider.ollama, RunProvider.foundry) for run in result.runs)


async def test_steps_show_recorded_latency_and_a_live_fact_check(
    service: PipelineService, request_: PipelineRequest
) -> None:
    result = await service.run(request_)
    steps = {step.role.value: step for step in result.steps or []}
    assert steps["MATCH_ANALYST"].latencyMs == RECORDED_MS[AgentName.MATCH_ANALYST]
    assert steps["MATCH_ANALYST"].provider is RunProvider.recorded
    assert steps["FACT_CHECKER"].provider is RunProvider.template
    assert steps["FACT_CHECKER"].decision.value == "PASS"


async def test_a_moment_without_a_recording_gets_the_labelled_template_result(
    tmp_path: Path, request_: PipelineRequest
) -> None:
    other = request_.model_copy(deep=True)
    other.packet.insight.matchClockMs += 1
    service = build_service(settings_for(write(tmp_path, recording_for(request_))), FakeClock())
    result = await service.run(other)
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason == NO_RECORDING
    assert {n.source for n in result.narratives} == {NarrativeSource.TEMPLATE}
    assert RunProvider.recorded not in {run.provider for run in result.runs}


async def test_the_recording_is_matched_by_facts_not_by_insight_id(
    service: PipelineService, request_: PipelineRequest
) -> None:
    renamed = request_.model_copy(deep=True)
    renamed.packet.insight.insightId = "in_another_session"
    renamed.packet.insight.evidence.insightId = "in_another_session"
    renamed.packet.fixtureId = renamed.packet.insight.fixtureId = "fx_comeback_42_s9"
    renamed.packet.insight.evidence.fixtureId = "fx_comeback_42_s9"
    result = await service.run(renamed)
    assert result.fallbackReason is None
    assert RunProvider.recorded in {run.provider for run in result.runs}


async def test_numbers_that_no_longer_match_are_rejected_and_the_template_airs(
    tmp_path: Path,
) -> None:
    recorded_for = build_request(CaseSpec(metrics={"highRecoveries.home.rolling5m": 5}))
    service = build_service(settings_for(write(tmp_path, recording_for(recorded_for))), FakeClock())
    changed = build_request(CaseSpec(metrics={"highRecoveries.home.rolling5m": 9}))
    result = await service.run(changed)
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason is not None
    assert "fact checker" in result.fallbackReason
    assert all(n.source is NarrativeSource.TEMPLATE for n in result.narratives)
    assert result.verification is not None


async def test_the_pause_is_configurable_and_zero_is_allowed(
    tmp_path: Path, request_: PipelineRequest
) -> None:
    directory = write(tmp_path, recording_for(request_))
    pauses: list[float] = []

    async def sleep(seconds: float) -> None:
        pauses.append(seconds)

    for latency_ms in (1500, 0):
        settings = settings_for(directory, latency_ms)
        pipeline = build_orchestrator(settings, FakeClock())
        service = RecordedService(pipeline, load_recordings(settings), latency_ms, sleep)
        await service.run(request_)
    assert pauses == [1.5]


def test_the_default_pause_is_one_and_a_half_seconds() -> None:
    assert Settings(agents_service_token=SecretStr(TOKEN)).recorded_latency_ms == 1500
    with pytest.raises(ValidationError):
        settings_for(None, latency_ms=-1)


def test_recorded_is_never_allowed_in_production() -> None:
    with pytest.raises(ValidationError, match="recorded is not permitted in prod"):
        Settings(
            agents_service_token=SecretStr(TOKEN),
            model_provider=ModelProvider.RECORDED,
            app_env=AppEnvironment.PROD,
        )


def test_recorded_mode_has_no_ai_critique() -> None:
    assert settings_for(None).critique_enabled is False


Document = dict[str, Any]


def wrong_version(d: Document) -> None:
    d["formatVersion"] = 99


def repeated_variant(d: Document) -> None:
    d["moments"][0]["narratives"].append(d["moments"][0]["narratives"][0])


def repeated_moment(d: Document) -> None:
    d["moments"].append(d["moments"][0])


def unknown_kind(d: Document) -> None:
    d["moments"][0]["key"]["kind"] = "NOT_A_KIND"


def no_moments(d: Document) -> None:
    del d["moments"]


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (wrong_version, "format 99"),
        (repeated_variant, "twice"),
        (repeated_moment, "same moment"),
        (unknown_kind, "kind"),
        (no_moments, "moments"),
    ],
)
def test_an_invalid_recording_stops_start_up_with_a_clear_error(
    tmp_path: Path, request_: PipelineRequest, mutate: Callable[[Document], None], message: str
) -> None:
    document = recording_for(request_)
    mutate(document)
    with pytest.raises(RecordingError, match=message):
        build_service(settings_for(write(tmp_path, document)), FakeClock())


def test_unreadable_or_missing_recordings_stop_start_up(tmp_path: Path) -> None:
    (tmp_path / "bad.json").write_text("{not json")
    with pytest.raises(RecordingError, match=r"bad\.json is not valid"):
        build_service(settings_for(tmp_path), FakeClock())
    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(RecordingError, match="no recordings found"):
        build_service(settings_for(empty), FakeClock())


def test_the_app_fails_fast_on_a_bad_recording(tmp_path: Path) -> None:
    (tmp_path / "bad.json").write_text("[]")
    with pytest.raises(RecordingError):
        create_app(settings_for(tmp_path))


def test_readiness_says_a_recording_is_replayed_not_a_live_model() -> None:
    body = TestClient(create_app(settings_for(None))).get("/api/v1/health/ready").json()
    assert body["status"] == "degraded"
    detail = body["checks"]["recorded"]["detail"]
    assert "no live model" in detail
    assert "foundry" not in detail.lower()


def test_the_committed_recording_is_valid_small_and_free_of_tenant_data() -> None:
    directory = load_recordings(settings_for(None))
    assert len(directory) > 0
    recordings = Path(__file__).resolve().parents[1] / "src/matchiq_agents/providers/recordings"
    files = list(recordings.glob("*.json"))
    assert files
    for file in files:
        text = file.read_text()
        assert len(text) < 1_000_000
        assert "org_" not in text
        assert '"in_' not in text
        document = json.loads(text)
        assert {m["source"]["model"] for m in document["moments"]} <= {
            "qwen2.5:7b-instruct",
            "qwen2.5:3b-instruct",
        }
        for moment in document["moments"]:
            assert moment["key"]["templateId"] == document["templateId"]
            assert Persona.CASUAL.value in {n["persona"] for n in moment["narratives"]}
