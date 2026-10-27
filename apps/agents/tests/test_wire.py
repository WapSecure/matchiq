"""The HTTP body must satisfy the worker's PipelineResult contract (MQ-119)."""

from pathlib import Path
from typing import Any, cast

from pydantic import SecretStr

from matchiq_agents.api.pipeline import to_wire
from matchiq_agents.constants import REQUIRED_NULLABLE_FIELDS
from matchiq_agents.contracts.types import Persona, PipelineRequest
from matchiq_agents.pipeline.orchestrator import PipelineService
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_service
from tests.conftest import TOKEN
from tests.support.builders import CaseSpec, build_request
from tests.support.models import FakeClock, ScriptedModel
from tests.test_recorded_provider import recording_for, settings_for, write


def nulls_below_the_top(value: object, path: str = "") -> list[str]:
    if isinstance(value, dict):
        fields = cast(dict[str, Any], value)
        return [
            found
            for key, item in fields.items()
            for found in (
                [f"{path}.{key}"] if item is None else nulls_below_the_top(item, f"{path}.{key}")
            )
        ]
    if isinstance(value, list):
        items = cast(list[Any], value)
        return [
            found
            for index, item in enumerate(items)
            for found in nulls_below_the_top(item, f"{path}[{index}]")
        ]
    return []


async def test_an_optional_field_without_a_value_is_omitted_from_every_narrative(
    tmp_path: Path,
) -> None:
    request = build_request(CaseSpec())
    service: PipelineService = build_service(
        settings_for(write(tmp_path, recording_for(request))), FakeClock()
    )
    wire = to_wire(await service.run(request))
    translated = [n for n in wire["narratives"] if n["locale"] != "en-GB"]
    assert translated
    assert not [n for n in translated if n["persona"] != Persona.ANALYST.value and "breakdown" in n]
    assert (
        nulls_below_the_top({k: v for k, v in wire.items() if k not in REQUIRED_NULLABLE_FIELDS})
        == []
    )
    assert all(field in wire for field in REQUIRED_NULLABLE_FIELDS)


async def test_a_live_style_run_serialises_the_same_way() -> None:
    request: PipelineRequest = build_request(CaseSpec())
    service = build_service(
        Settings(agents_service_token=SecretStr(TOKEN)), FakeClock(), ScriptedModel()
    )
    wire = to_wire(await service.run(request))
    assert (
        nulls_below_the_top({k: v for k, v in wire.items() if k not in REQUIRED_NULLABLE_FIELDS})
        == []
    )
