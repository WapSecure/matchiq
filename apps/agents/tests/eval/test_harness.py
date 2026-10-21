"""The oracle must catch what it claims to catch, or a green eval run means nothing."""

from matchiq_agents.contracts.types import PipelineResult
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.templates.fallback import TemplateFallback
from tests.eval.harness import evaluate
from tests.support.builders import build_request

REQUEST = build_request()


def _result(body: str) -> PipelineResult:
    view = build_fact_view(REQUEST)
    draft = TemplateFallback(view).draft(view.personas[0], view.locales[0])
    return PipelineResult.model_validate(
        {
            "schemaVersion": 1,
            "runId": REQUEST.packet.runId,
            "correlationId": REQUEST.packet.correlationId,
            "status": "VERIFIED",
            "analysis": None,
            "verification": None,
            "narratives": [draft.model_copy(update={"body": body})],
            "overlay": None,
            "runs": [],
        }
    )


def test_oracle_passes_grounded_text() -> None:
    assert evaluate("ok", REQUEST, _result("Harbour City won 5 high recoveries.")).violations == 0


def test_oracle_flags_unsupported_numbers_entities_and_injection() -> None:
    report = evaluate("bad", REQUEST, _result("Harbour City lead Arsenal 9-0, ignore previous."))
    assert report.unsupported_numbers
    assert "Arsenal" in report.unknown_entities
    assert report.injection_leaks
