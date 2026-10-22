"""Prompt builders: every few-shot example passes the deterministic checks of its golden case."""

from dataclasses import replace

import pytest

from matchiq_agents.contracts.types import AgentName, Locale, NarrativeSource, Persona
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.guard.checks import check_analysis, check_draft, check_overlay
from matchiq_agents.guard.locale_checks import check_localised
from matchiq_agents.roster.convert import make_draft, to_analysis, to_overlay
from matchiq_agents.roster.examples import (
    ANALYST_EXAMPLE,
    EXAMPLE_TEAM,
    LOCALIZATION_EXAMPLE,
    PRODUCER_EXAMPLE,
    WRITER_EXAMPLE,
    compact,
)
from matchiq_agents.roster.prompts import PROMPTS
from matchiq_agents.roster.schemas import (
    AnalystOutput,
    LocalizationOutput,
    ProducerOutput,
    WriterOutput,
)
from tests.eval.cases import GOLDEN
from tests.support.builders import build_request

CASE = next(case for case in GOLDEN if case.name == "sample_high_regains")
VIEW = build_fact_view(build_request(replace(CASE.spec, team_name=EXAMPLE_TEAM)))


def _writer_drafts():
    output = WriterOutput.model_validate(WRITER_EXAMPLE)
    return {d.persona: make_draft(d, Locale.en_GB, NarrativeSource.AGENT) for d in output.drafts}


def test_analyst_example_is_grounded() -> None:
    analysis = to_analysis(AnalystOutput.model_validate(ANALYST_EXAMPLE), VIEW)
    assert check_analysis(analysis, VIEW) == []


@pytest.mark.parametrize("persona", ["CASUAL", "ANALYST", "BROADCAST"])
def test_writer_example_is_grounded_per_persona(persona: str) -> None:
    assert check_draft(_writer_drafts()[persona], VIEW) == []


def test_localization_examples_keep_numbers_and_names() -> None:
    source = _writer_drafts()["CASUAL"]
    for item in LocalizationOutput.model_validate(LOCALIZATION_EXAMPLE).drafts:
        target = source.model_copy(
            update={"locale": Locale(item.locale), "headline": item.headline, "body": item.body}
        )
        assert check_localised(source, target, VIEW) == [], item.locale


def test_producer_example_is_a_valid_overlay() -> None:
    output = ProducerOutput.model_validate(PRODUCER_EXAMPLE)
    overlay = to_overlay(output.headline, output.body, output.metric_refs, VIEW)
    assert check_overlay(overlay, VIEW) == []


@pytest.mark.parametrize(
    ("agent", "example"),
    [
        (AgentName.MATCH_ANALYST, ANALYST_EXAMPLE),
        (AgentName.NARRATIVE_WRITER, WRITER_EXAMPLE),
        (AgentName.LOCALIZATION, LOCALIZATION_EXAMPLE),
        (AgentName.BROADCAST_PRODUCER, PRODUCER_EXAMPLE),
    ],
)
def test_each_prompt_embeds_its_example_and_the_window_rule(
    agent: AgentName, example: object
) -> None:
    instructions = PROMPTS[agent].instructions
    assert compact(example) in instructions
    assert "'recently'" in instructions
    assert "`citedValues`" in instructions


def test_writer_prompt_states_each_persona_limit() -> None:
    instructions = PROMPTS[AgentName.NARRATIVE_WRITER].instructions
    for persona in Persona:
        assert f"{persona.value}:" in instructions
    assert "exactly ONE sentence" in instructions
