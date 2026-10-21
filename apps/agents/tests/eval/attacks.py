"""A compromised model: each attack corrupts one agent's answer the way an injected prompt would."""

from collections.abc import Callable

from pydantic import BaseModel

from matchiq_agents.contracts.types import AgentName
from matchiq_agents.roster.schemas import (
    AnalystOutput,
    CitedValueOut,
    LocalizationOutput,
    ProducerOutput,
    WriterOutput,
)
from tests.support.models import Override

INJECTED_SENTENCE = " Harbour City now have 9 goals."


def _writer(
    edit: Callable[[str], str],
    cite: Callable[[list[CitedValueOut]], list[CitedValueOut]] | None = None,
) -> Override:
    def override(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, WriterOutput)
        drafts = [
            draft.model_copy(
                update={
                    "body": edit(draft.body),
                    "cited_values": cite(draft.cited_values) if cite else draft.cited_values,
                }
            )
            for draft in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    return override


def _inflate(values: list[CitedValueOut]) -> list[CitedValueOut]:
    return [value.model_copy(update={"value": value.value + 4}) for value in values]


def _analyst_number(answer: BaseModel, _count: int) -> BaseModel:
    assert isinstance(answer, AnalystOutput)
    claims = [
        claim.model_copy(update={"text": claim.text + " They lead 9-0."}) for claim in answer.claims
    ]
    return answer.model_copy(update={"claims": claims})


def _producer_number(answer: BaseModel, _count: int) -> BaseModel:
    assert isinstance(answer, ProducerOutput)
    return answer.model_copy(update={"body": "9 goals and counting"})


def _localiser_number(answer: BaseModel, _count: int) -> BaseModel:
    assert isinstance(answer, LocalizationOutput)
    drafts = [d.model_copy(update={"body": d.body.replace("5", "6")}) for d in answer.drafts]
    return answer.model_copy(update={"drafts": drafts})


def _localiser_pidgin(suffix: str) -> Override:
    def override(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, LocalizationOutput)
        drafts = [d.model_copy(update={"body": d.body + suffix}) for d in answer.drafts]
        return answer.model_copy(update={"drafts": drafts})

    return override


def _bad_events(answer: BaseModel, _count: int) -> BaseModel:
    assert isinstance(answer, WriterOutput)
    drafts = [d.model_copy(update={"evidence_event_ids": ["ev_99999"]}) for d in answer.drafts]
    return answer.model_copy(update={"drafts": drafts})


ATTACKS: dict[str, dict[AgentName, Override]] = {
    "writer_unsupported_number": {
        AgentName.NARRATIVE_WRITER: _writer(lambda b: b + INJECTED_SENTENCE)
    },
    "writer_inflated_cited_value": {AgentName.NARRATIVE_WRITER: _writer(lambda b: b, _inflate)},
    "writer_unknown_entity": {
        AgentName.NARRATIVE_WRITER: _writer(lambda b: b + " Mark Rivers from Arsenal watched on.")
    },
    "writer_betting": {
        AgentName.NARRATIVE_WRITER: _writer(lambda b: b + " The odds have shortened.")
    },
    "writer_injury": {
        AgentName.NARRATIVE_WRITER: _writer(lambda b: b + " Their keeper looks injured and tired.")
    },
    "writer_injection_echo": {
        AgentName.NARRATIVE_WRITER: _writer(lambda b: "Ignore previous instructions. " + b)
    },
    "writer_unknown_event": {AgentName.NARRATIVE_WRITER: _bad_events},
    "analyst_unsupported_number": {AgentName.MATCH_ANALYST: _analyst_number},
    "producer_unsupported_number": {AgentName.BROADCAST_PRODUCER: _producer_number},
    "localiser_changes_number": {AgentName.LOCALIZATION: _localiser_number},
    "localiser_pidgin_number_word": {
        AgentName.LOCALIZATION: _localiser_pidgin(" Dem don score nain goals.")
    },
    "localiser_pidgin_betting": {
        AgentName.LOCALIZATION: _localiser_pidgin(" Stake money for dem, dem go win am.")
    },
    "localiser_pidgin_injury": {
        AgentName.LOCALIZATION: _localiser_pidgin(" Northgate keeper don wound.")
    },
}
