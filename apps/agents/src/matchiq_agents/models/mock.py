"""Deterministic development model (provider `mock`). Not an integration; see ADR-0003.

Output depends only on the payload: the same input always gives the same output, and the phrase
variant is chosen from a hash of the payload so mock text is distinguishable from templates.
"""

import hashlib
from collections.abc import Callable
from typing import Final

from pydantic import BaseModel

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, Locale, Persona, RunProvider
from matchiq_agents.guard.data_block import encode_data
from matchiq_agents.models.port import ModelOutputError, ModelUsage
from matchiq_agents.roster.schemas import (
    AnalystInput,
    AnalystOutput,
    CritiqueOutput,
    LocalizationInput,
    LocalizationOutput,
    LocalizedOut,
    ProducerInput,
    ProducerOutput,
    WriterInput,
    WriterOutput,
)
from matchiq_agents.templates.compose import render_text
from matchiq_agents.templates.fallback import analyst_output, rendered_to_draft

UNSUPPORTED_PAYLOAD: Final = "mock model cannot answer {payload} as {response}"


def payload_variant(payload: BaseModel) -> int:
    return hashlib.sha256(encode_data(payload).encode()).digest()[0]


def _analyse(payload: AnalystInput, variant: int) -> AnalystOutput:
    return analyst_output(payload.facts, variant)


def _write(payload: WriterInput, variant: int) -> WriterOutput:
    drafts = [
        rendered_to_draft(
            render_text(payload.facts, persona, payload.locale, variant),
            persona,
            payload.facts.event_ids,
        )
        for persona in payload.personas
    ]
    return WriterOutput(drafts=drafts)


def _localise(payload: LocalizationInput, variant: int) -> LocalizationOutput:
    drafts: list[LocalizedOut] = []
    for item in payload.required_items:
        persona, locale = Persona(item.persona), Locale(item.locale)
        text = render_text(payload.facts, persona, locale, variant)
        drafts.append(
            LocalizedOut.model_validate(
                {
                    "locale": item.locale,
                    "persona": item.persona,
                    "headline": text.headline,
                    "body": text.body,
                }
            )
        )
    return LocalizationOutput(drafts=drafts)


def _produce(payload: ProducerInput, variant: int) -> ProducerOutput:
    text = render_text(payload.facts, Persona.BROADCAST, Locale.en_GB, variant)
    return ProducerOutput(
        headline=text.headline, body=text.body, metric_refs=[ref for ref, _ in text.cited]
    )


def _critique(_payload: BaseModel, _variant: int) -> CritiqueOutput:
    return CritiqueOutput(verdict="PASS", concerns=[])


_HANDLERS: Final[dict[type[BaseModel], tuple[type[BaseModel], Callable[..., BaseModel]]]] = {
    AnalystOutput: (AnalystInput, _analyse),
    WriterOutput: (WriterInput, _write),
    LocalizationOutput: (LocalizationInput, _localise),
    ProducerOutput: (ProducerInput, _produce),
    CritiqueOutput: (BaseModel, _critique),
}


class MockModel:
    @property
    def provider(self) -> RunProvider:
        return RunProvider.mock

    @property
    def deployment(self) -> str | None:
        return None

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        handler = _HANDLERS.get(response_model)
        if handler is None or not isinstance(payload, handler[0]):
            detail = UNSUPPORTED_PAYLOAD.format(
                payload=type(payload).__name__, response=response_model.__name__
            )
            raise ModelOutputError(detail)
        output = handler[1](payload, payload_variant(payload))
        return response_model.model_validate(output.model_dump()), ModelUsage(self.provider)
