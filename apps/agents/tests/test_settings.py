from pathlib import Path

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


ENV_EXAMPLE = Path(__file__).resolve().parents[3] / ".env.example"


def _example_values() -> dict[str, str]:
    lines = ENV_EXAMPLE.read_text().splitlines()
    pairs = [line.split("=", 1) for line in lines if "=" in line and not line.startswith("#")]
    return {key.strip(): value.strip() for key, value in pairs}


def test_env_example_with_only_secrets_filled_is_valid(monkeypatch: pytest.MonkeyPatch) -> None:
    values = _example_values()
    assert values["FOUNDRY_PROJECT_ENDPOINT"] == ""
    for key, value in {**values, "AGENTS_SERVICE_TOKEN": TOKEN}.items():
        monkeypatch.setenv(key, value)
    settings = Settings()  # pyright: ignore[reportCallIssue]
    assert settings.foundry_project_endpoint is None
    assert settings.foundry_model is None
    assert settings.azure_client_id is None
    assert settings.model_provider is ModelProvider.MOCK


def test_env_example_loads_as_an_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    text = ENV_EXAMPLE.read_text().replace(
        "AGENTS_SERVICE_TOKEN=\n", f"AGENTS_SERVICE_TOKEN={TOKEN}\n"
    )
    env_file.write_text(text)
    settings = Settings(_env_file=env_file)  # pyright: ignore[reportCallIssue]
    assert settings.foundry_project_endpoint is None
    assert str(settings.ollama_endpoint) == "http://localhost:11434/v1/"
