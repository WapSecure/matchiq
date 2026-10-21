"""Release-gate evaluation against MockModel and templates (runs in CI, no network)."""

import pytest
from pydantic import SecretStr

from matchiq_agents.contracts.types import NarrativeSource, PipelineStatus, RunOutcome
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.eval.attacks import ATTACKS
from tests.eval.cases import ADVERSARIAL_INPUTS, GOLDEN, EvalCase
from tests.eval.harness import CaseReport, evaluate
from tests.support.builders import build_request
from tests.support.models import FailingModel, FakeClock, ScriptedModel

SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))
ALL_CASES = GOLDEN + ADVERSARIAL_INPUTS


async def run_case(case: EvalCase, model: ModelPort) -> CaseReport:
    request = build_request(case.spec)
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(request)
    return evaluate(case.name, request, result)


def test_suite_has_at_least_thirty_golden_cases() -> None:
    assert len(GOLDEN) >= 30
    assert len({case.name for case in ALL_CASES}) == len(ALL_CASES)


@pytest.mark.parametrize("case", ALL_CASES, ids=lambda c: c.name)
async def test_mock_pipeline_is_grounded(case: EvalCase) -> None:
    report = await run_case(case, MockModel())
    assert report.violations == 0, report
    assert report.status in {PipelineStatus.VERIFIED.value, PipelineStatus.FALLBACK.value}
    assert not report.identical_personas, report


@pytest.mark.parametrize("case", ALL_CASES, ids=lambda c: c.name)
async def test_fallback_is_grounded_with_model_down(case: EvalCase) -> None:
    report = await run_case(case, FailingModel())
    assert report.violations == 0, report
    assert report.status == PipelineStatus.FALLBACK.value
    assert report.sources <= {NarrativeSource.TEMPLATE.value}


@pytest.mark.parametrize("attack", sorted(ATTACKS), ids=str)
async def test_compromised_model_never_gets_unsupported_claims_through(attack: str) -> None:
    report = await run_case(GOLDEN[0], ScriptedModel(ATTACKS[attack]))
    assert report.violations == 0, report


async def test_persona_variants_differ_but_numbers_match() -> None:
    request = build_request(GOLDEN[0].spec)
    result = await build_orchestrator(SETTINGS, FakeClock(), MockModel()).run(request)
    english = {d.persona.value: d for d in result.narratives if d.locale.value == "en-GB"}
    assert len({d.body for d in english.values()}) == len(english) == 3
    assert len(english["ANALYST"].body) > len(english["CASUAL"].body)
    metrics = request.packet.insight.evidence.computedMetrics
    for draft in result.narratives:
        assert all(metrics[v.metricRef] == v.value for v in draft.citedValues)


async def test_injected_names_are_never_narrated() -> None:
    for case in ADVERSARIAL_INPUTS:
        request = build_request(case.spec)
        result = await build_orchestrator(SETTINGS, FakeClock(), MockModel()).run(request)
        names = [p.displayName for p in request.packet.entities.players]
        names += [t.name for t in request.packet.entities.teams]
        hostile = [n for n in names if not n.replace(" ", "").replace("'", "").isalpha()]
        hostile += [n for n in names if "instruction" in n.lower()]
        for draft in result.narratives:
            assert not any(name in draft.body or name in draft.headline for name in hostile)


async def test_attack_runs_are_recorded_as_failed_then_fallback() -> None:
    model = ScriptedModel(ATTACKS["writer_unsupported_number"])
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(build_request())
    assert result.status is PipelineStatus.FALLBACK
    assert result.verification is not None
    assert result.fallbackReason
    writer_runs = [run for run in result.runs if run.agent.value == "NARRATIVE_WRITER"]
    assert len(writer_runs) == 2
    assert all(run.outcome is RunOutcome.SUCCEEDED for run in writer_runs)
