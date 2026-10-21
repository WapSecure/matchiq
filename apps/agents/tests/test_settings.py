import pytest
from pydantic import SecretStr, ValidationError

from matchiq_agents.settings import AppEnvironment, ModelProvider, Settings
from tests.conftest import TOKEN


def test_defaults_to_mock_provider() -> None:
    assert Settings(agents_service_token=SecretStr(TOKEN)).model_provider is ModelProvider.MOCK


def test_foundry_requires_endpoint_and_model() -> None:
    with pytest.raises(ValidationError, match="FOUNDRY_PROJECT_ENDPOINT"):
        Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.FOUNDRY)


def test_mock_provider_is_rejected_in_production() -> None:
    with pytest.raises(ValidationError, match="not permitted in prod"):
        Settings(agents_service_token=SecretStr(TOKEN), app_env=AppEnvironment.PROD)


def test_short_service_token_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(agents_service_token=SecretStr("short"))


def test_token_is_not_rendered_in_repr() -> None:
    assert TOKEN not in repr(Settings(agents_service_token=SecretStr(TOKEN)))


def test_reads_agent_framework_variable_names(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_SERVICE_TOKEN", TOKEN)
    monkeypatch.setenv("MODEL_PROVIDER", "foundry")
    monkeypatch.setenv("FOUNDRY_PROJECT_ENDPOINT", "https://a.services.ai.azure.com/api/projects/p")
    monkeypatch.setenv("FOUNDRY_MODEL", "gpt-4o-mini")
    settings = Settings()  # pyright: ignore[reportCallIssue]
    assert settings.foundry_model == "gpt-4o-mini"
