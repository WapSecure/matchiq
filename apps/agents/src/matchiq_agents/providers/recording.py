"""Recorded model output (provider `recorded`, ADR-0042): schema, matching key and loader.

A recording holds what a real local model wrote for the moments of one match template, exported
by `scripts/export_recording.py`. Moments are matched by facts that are stable across sessions of
the same template, never by insight id.
"""

import json
from collections.abc import Iterable, Mapping
from pathlib import Path
from types import MappingProxyType
from typing import Literal, Self

from pydantic import Field, ValidationError, model_validator

from matchiq_agents.constants import RECORDING_FORMAT_VERSION
from matchiq_agents.contracts.types import (
    AgentName,
    InsightKind,
    Locale,
    Persona,
    PipelineRequest,
    RunOutcome,
)
from matchiq_agents.domain.facts import FactView
from matchiq_agents.roster.schemas import CitedValueOut, StrictModel

NO_SIDE = "none"


class RecordingError(RuntimeError):
    """The recording is missing, unreadable or inconsistent; the service must not start."""


class MomentKey(StrictModel):
    """Facts that identify one detected moment in every session of a template."""

    template_id: str
    kind: InsightKind
    period: int
    match_clock_ms: int
    side: Literal["home", "away", "none"]
    reason_code: str


class RecordedNarrative(StrictModel):
    persona: Persona
    locale: Locale
    headline: str
    body: str
    evidence_event_ids: list[str]
    # en-GB only: other locales copy the canonical draft's citations, as the live pipeline does.
    cited_values: list[CitedValueOut]
    locale_fallback: bool


class RecordedOverlay(StrictModel):
    headline: str
    body: str
    metric_refs: list[str]


class RecordedRepair(StrictModel):
    code: str
    detail: str


class RecordedRun(StrictModel):
    agent: AgentName
    # How it ran when recorded; replay relabels `ollama` as `recorded`, never the other way.
    provider: Literal["ollama", "template"]
    outcome: RunOutcome
    latency_ms: int
    retries: int
    prompt_version: str
    prompt_hash: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    repairs: list[RecordedRepair] = Field(default_factory=list[RecordedRepair])


class RecordedSource(StrictModel):
    """Where a moment's wording came from: the session, its model and the day it ran."""

    session: str
    model: str
    recorded_on: str


class RecordedMoment(StrictModel):
    key: MomentKey
    source: RecordedSource
    narratives: list[RecordedNarrative]
    overlay: RecordedOverlay | None
    runs: list[RecordedRun]

    @model_validator(mode="after")
    def _unique_variants(self) -> Self:
        variants = [(item.persona, item.locale) for item in self.narratives]
        if len(set(variants)) != len(variants):
            raise ValueError("a persona and locale are recorded twice")
        return self

    def narrative(self, persona: Persona, locale: Locale) -> RecordedNarrative | None:
        return next(
            (n for n in self.narratives if n.persona is persona and n.locale is locale), None
        )

    def runs_of(self, agent: AgentName) -> list[RecordedRun]:
        return [run for run in self.runs if run.agent is agent]


class Recording(StrictModel):
    format_version: int
    template_id: str
    exported_with: str
    note: str
    moments: list[RecordedMoment]


def template_id_of(fixture_id: str) -> str:
    """`fx_comeback_42_s7` and `fx_comeback_42` both belong to template `fx_comeback_42`."""
    head, _, tail = fixture_id.rpartition("_")
    return head if head and tail.startswith("s") and tail[1:].isdigit() else fixture_id


def key_for(request: PipelineRequest, view: FactView) -> MomentKey:
    insight = request.packet.insight
    return MomentKey.model_validate(
        {
            "templateId": template_id_of(view.fixture_id),
            "kind": view.kind,
            "period": insight.period,
            "matchClockMs": insight.matchClockMs,
            "side": view.subject_side or NO_SIDE,
            "reasonCode": insight.reasonCode,
        }
    )


class RecordingIndex:
    """Recorded moments by key, merged from every file in a directory."""

    def __init__(self, recordings: Iterable[Recording]) -> None:
        moments: dict[MomentKey, RecordedMoment] = {}
        for recording in recordings:
            for moment in recording.moments:
                if moment.key in moments:
                    raise RecordingError(f"two recordings cover the same moment: {moment.key}")
                moments[moment.key] = moment
        self._moments: Mapping[MomentKey, RecordedMoment] = MappingProxyType(moments)

    def __len__(self) -> int:
        return len(self._moments)

    def find(self, key: MomentKey) -> RecordedMoment | None:
        return self._moments.get(key)


def load_recording(path: Path) -> Recording:
    try:
        recording = Recording.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except OSError as error:
        raise RecordingError(f"cannot read recording {path.name}: {error.strerror}") from error
    except (ValueError, ValidationError) as error:
        raise RecordingError(
            f"recording {path.name} is not valid: {_first_problem(error)}"
        ) from error
    if recording.format_version != RECORDING_FORMAT_VERSION:
        raise RecordingError(
            f"recording {path.name} has format {recording.format_version}, "
            f"expected {RECORDING_FORMAT_VERSION}"
        )
    return recording


def _first_problem(error: ValueError) -> str:
    if isinstance(error, ValidationError):
        first = error.errors(include_input=False)[0]
        where = ".".join(str(part) for part in first["loc"])
        return f"{where}: {first['msg']}"
    return str(error)


def load_index(directory: Path) -> RecordingIndex:
    files = sorted(directory.glob("*.json"))
    if not files:
        raise RecordingError(f"no recordings found in {directory}")
    return RecordingIndex(load_recording(file) for file in files)
