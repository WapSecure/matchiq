"""The Zod-exported and Pydantic-generated schemas must agree on required-ness and nullability.

Codegen guarantees the field set; it cannot see how Python serialises. A field that Zod marks
optional-but-not-nullable is generated as `X | None = None`, which is wider than the worker accepts.
That single widening is allowed and only because `to_wire` drops None values (pinned by
`test_contract_roundtrip.py`); everything else must match exactly.
"""

import json
from pathlib import Path

import pytest
from pydantic import BaseModel

from matchiq_agents.contracts.types import PipelineRequest, PipelineResult
from tests.support.schema_shapes import Shapes, shapes_of

ZOD_SCHEMAS = Path(__file__).parents[3] / "libs" / "contracts" / "generated" / "json-schema"
MODELS: dict[str, type[BaseModel]] = {
    "PipelineRequest": PipelineRequest,
    "PipelineResult": PipelineResult,
}


def disagreements(zod: Shapes, pydantic: Shapes) -> list[str]:
    found: list[str] = []
    for path in sorted(set(zod) | set(pydantic)):
        z, p = zod.get(path), pydantic.get(path)
        if z is None or p is None:
            found.append(f"{path}: only in {'zod' if p is None else 'pydantic'}")
        elif z[0] != p[0]:
            found.append(f"{path}: required zod={z[0]} pydantic={p[0]}")
        elif z[1] and not p[1]:
            found.append(f"{path}: zod accepts null, pydantic rejects it")
        elif p[1] and not z[1] and z[0]:
            found.append(f"{path}: required, pydantic accepts null, zod rejects it")
    return found


@pytest.mark.parametrize("name", MODELS)
def test_required_and_nullable_agree_with_the_worker_contract(name: str) -> None:
    zod = shapes_of(json.loads((ZOD_SCHEMAS / f"{name}.json").read_text()))
    pydantic = shapes_of(MODELS[name].model_json_schema())
    assert len(zod) > 50
    assert disagreements(zod, pydantic) == []


def test_the_comparison_catches_each_kind_of_drift() -> None:
    zod: Shapes = {
        ".a": (True, False),
        ".b": (False, False),
        ".c": (True, True),
        ".d": (True, False),
    }
    drifted: Shapes = {
        ".a": (False, False),
        ".b": (False, True),
        ".c": (True, False),
        ".d": (True, True),
    }
    assert disagreements(zod, drifted) == [
        ".a: required zod=True pydantic=False",
        ".c: zod accepts null, pydantic rejects it",
        ".d: required, pydantic accepts null, zod rejects it",
    ]
    assert disagreements(zod, {**zod, ".e": (False, False)}) == [".e: only in pydantic"]


def test_the_only_widening_is_on_optional_fields_that_the_wire_helper_strips() -> None:
    zod = shapes_of(json.loads((ZOD_SCHEMAS / "PipelineResult.json").read_text()))
    pydantic = shapes_of(PipelineResult.model_json_schema())
    widened = [p for p in zod if zod[p] != pydantic[p]]
    assert widened
    assert all(zod[p] == (False, False) and pydantic[p] == (False, True) for p in widened)
