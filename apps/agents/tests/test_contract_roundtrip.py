"""Both directions of the worker/agents boundary, against the worker's real Zod contracts (MQ-127).

Worker to agents: `fixtures/worker_requests.json` is `buildPipelineRequest` output over every golden
match (the worker's `pipeline-request.contract.spec.ts` pins it to the builder) and
`fixtures/comeback_requests.json` is 19 captured comeback requests, so Pydantic must accept them
and re-emit them unchanged. Agents to worker: every HTTP body the real
route returns, for every request and demo fault, must satisfy Zod's `PipelineResult`.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from matchiq_agents.app import create_app
from matchiq_agents.constants import PIPELINE_RUNS_PATH
from matchiq_agents.contracts.types import PipelineRequest
from matchiq_agents.settings import ModelProvider, Settings
from tests.conftest import TOKEN
from tests.support.zod import zod_issues

FIXTURES = Path(__file__).parent / "fixtures"
FILES = ["worker_requests.json", "comeback_requests.json"]
TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z")
AUTH = {"Authorization": f"Bearer {TOKEN}"}
FAULTS = [None, "WRITER_REVISE", "MODEL_TIMEOUT"]


def canonical(value: Any) -> Any:
    """Pydantic prints `.769000Z` where the worker prints `.769Z`; both are the same instant."""
    if isinstance(value, dict):
        fields = cast(dict[str, Any], value)
        return {k: canonical(v) for k, v in fields.items()}
    if isinstance(value, list):
        return [canonical(v) for v in cast(list[Any], value)]
    if isinstance(value, str) and TIMESTAMP.fullmatch(value):
        return datetime.fromisoformat(value)
    return value


def packets(*files: str) -> list[dict[str, Any]]:
    loaded: list[dict[str, Any]] = []
    for name in files or tuple(FILES):
        loaded += json.loads((FIXTURES / name).read_text())
    return loaded


@pytest.fixture(scope="module")
def mock_client() -> TestClient:
    settings = Settings(
        agents_service_token=SecretStr(TOKEN),
        model_provider=ModelProvider.MOCK,
        demo_faults_enabled=True,
    )
    return TestClient(create_app(settings))


def test_the_fixtures_cover_every_insight_kind_the_engine_emits() -> None:
    assert len(packets("comeback_requests.json")) == 19
    kinds = {p["packet"]["insight"]["kind"] for p in packets()}
    assert len(kinds) >= 6


def test_zod_accepts_every_worker_request_and_pydantic_reads_and_reemits_it_unchanged() -> None:
    items = packets()
    assert zod_issues("PipelineRequest", items) == [[]] * len(items)
    for item in items:
        model = PipelineRequest.model_validate(item)
        assert canonical(model.model_dump(mode="json", exclude_unset=True)) == canonical(item)
    reemitted = [
        PipelineRequest.model_validate(i).model_dump(mode="json", exclude_unset=True) for i in items
    ]
    assert zod_issues("PipelineRequest", reemitted) == [[]] * len(items)


@pytest.mark.parametrize("fault", FAULTS, ids=lambda f: f or "no-fault")
def test_every_mock_provider_body_satisfies_the_worker_result_contract(
    mock_client: TestClient, fault: str | None
) -> None:
    bodies: list[Any] = []
    for item in packets():
        body = {**item, "fault": fault} if fault else item
        response = mock_client.post(PIPELINE_RUNS_PATH, json=body, headers=AUTH)
        assert response.status_code == 200, response.text
        bodies.append(response.json())
    assert zod_issues("PipelineResult", bodies) == [[]] * len(bodies)
    if fault:
        assert all(run.get("faultInjected") for body in bodies for run in body["runs"])


def test_the_check_would_have_caught_the_null_breakdown_that_shipped() -> None:
    response = TestClient(
        create_app(
            Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.MOCK)
        )
    ).post(PIPELINE_RUNS_PATH, json=packets()[0], headers=AUTH)
    body = response.json()
    assert zod_issues("PipelineResult", [body]) == [[]]
    broken = json.loads(json.dumps(body))
    broken["narratives"][0]["breakdown"] = None
    assert any("breakdown" in issue for issue in zod_issues("PipelineResult", [broken])[0])
