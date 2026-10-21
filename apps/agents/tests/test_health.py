from fastapi.testclient import TestClient
from pydantic import HttpUrl, SecretStr

from matchiq_agents.app import create_app
from matchiq_agents.settings import ModelProvider, Settings
from tests.conftest import TOKEN


def test_liveness_reports_service_identity(client: TestClient) -> None:
    res = client.get("/api/v1/health/live")
    assert res.status_code == 200
    assert res.json() == {
        "status": "ok",
        "service": "matchiq-agents",
        "version": "1.2.3",
        "checks": {},
    }


def test_readiness_flags_mock_provider_as_degraded(client: TestClient) -> None:
    body = client.get("/api/v1/health/ready").json()
    assert body["status"] == "degraded"
    assert body["checks"]["foundry"]["detail"].startswith("mock provider")


def test_readiness_reports_configured_foundry_deployment() -> None:
    settings = Settings(
        agents_service_token=SecretStr(TOKEN),
        model_provider=ModelProvider.FOUNDRY,
        foundry_project_endpoint=HttpUrl("https://acct.services.ai.azure.com/api/projects/matchiq"),
        foundry_model="gpt-4o-mini",
    )
    body = TestClient(create_app(settings)).get("/api/v1/health/ready").json()
    assert body["status"] == "ok"
    assert body["checks"]["foundry"]["detail"] == "deployment gpt-4o-mini"


def test_api_docs_are_not_exposed(client: TestClient) -> None:
    assert client.get("/docs").status_code == 404
