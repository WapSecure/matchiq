"""Rejection diagnostics feed the failure taxonomy without changing what is accepted."""

import logging

import pytest
from pydantic import BaseModel, SecretStr

from matchiq_agents.contracts.types import AgentName, IssueCode
from matchiq_agents.guard import messages
from matchiq_agents.guard.checks import issue
from matchiq_agents.pipeline.diagnostics import LOGGER_NAME, rule_of
from matchiq_agents.roster.notes import revision_note
from matchiq_agents.roster.schemas import WriterOutput
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.eval.taxonomy import WINDOW_LENGTH, RejectionCollector, refine, taxonomy
from tests.support.builders import build_request
from tests.support.models import FakeClock, ScriptedModel

SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))


@pytest.mark.parametrize(
    ("detail", "rule"),
    [
        (messages.UNSUPPORTED_NUMERAL.format(raw="10"), "UNSUPPORTED_NUMERAL"),
        (messages.TOO_MANY_SENTENCES.format(count=2, limit=1), "TOO_MANY_SENTENCES"),
        (messages.WRONG_VALUE.format(metric_ref="a.b", cited=1, actual=2), "WRONG_VALUE"),
        (messages.UNSAFE.format(category="abuse"), "UNSAFE_CONTENT"),
        (messages.UNKNOWN_NAME.format(name="Arsenal"), "UNKNOWN_NAME"),
    ],
)
def test_rule_of_names_the_message_template(detail: str, rule: str) -> None:
    assert rule_of(issue(IssueCode.UNSUPPORTED_NUMBER, detail)) == rule


def test_unknown_detail_falls_back_to_the_contract_code() -> None:
    assert rule_of(issue(IssueCode.LENGTH_EXCEEDED, "something new")) == "LENGTH_EXCEEDED"


def test_window_numbers_are_split_out_of_unsupported_numerals() -> None:
    detail = messages.UNSUPPORTED_NUMERAL.format(raw="10")
    assert refine("UNSUPPORTED_NUMERAL", detail, "5 shots in the last 10 minutes") == WINDOW_LENGTH
    assert refine("UNSUPPORTED_NUMERAL", detail, "Harbour City lead 10 to nil") != WINDOW_LENGTH
    french = "5 tirs au cours des 10 dernières minutes"
    assert refine("UNSUPPORTED_NUMERAL", detail, french) == WINDOW_LENGTH


def test_revision_notes_say_how_to_fix_a_window_number() -> None:
    note = revision_note(
        issue(IssueCode.UNSUPPORTED_NUMBER, messages.UNSUPPORTED_NUMERAL.format(raw="10"))
    )
    assert "recently" in note


async def test_pipeline_logs_each_rejected_persona_with_its_rule() -> None:
    def unsupported_in_analyst(answer: BaseModel, count: int) -> BaseModel | None:
        assert isinstance(answer, WriterOutput)
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " and 77 more."})
            if d.persona == "ANALYST"
            else d
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    collector = RejectionCollector().install()
    try:
        model = ScriptedModel({AgentName.NARRATIVE_WRITER: unsupported_in_analyst})
        await build_orchestrator(SETTINGS, FakeClock(), model).run(build_request())
    finally:
        logging.getLogger(LOGGER_NAME).removeHandler(collector)
    found = collector.drain()
    assert {(r.agent, r.persona, r.rule) for r in found} == {
        ("FACT_CHECKER", "ANALYST", "UNSUPPORTED_NUMERAL")
    }
    assert {r.attempt for r in found} == {1, 2}
    assert "UNSUPPORTED_NUMERAL" in taxonomy(found)
