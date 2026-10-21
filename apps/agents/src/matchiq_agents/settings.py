from enum import StrEnum
from typing import Self

from pydantic import Field, HttpUrl, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from matchiq_agents.constants import DEFAULT_APP_VERSION, DEFAULT_PORT, SECRET_MIN_LENGTH


class ModelProvider(StrEnum):
    MOCK = "mock"
    FOUNDRY = "foundry"


class AppEnvironment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGE = "stage"
    PROD = "prod"


class Settings(BaseSettings):
    """Validated service configuration. Variable names follow Agent Framework conventions."""

    model_config = SettingsConfigDict(extra="ignore", frozen=True)

    app_env: AppEnvironment = AppEnvironment.LOCAL
    app_version: str = DEFAULT_APP_VERSION
    agents_port: int = Field(default=DEFAULT_PORT, ge=1, le=65_535)
    agents_service_token: SecretStr = Field(min_length=SECRET_MIN_LENGTH)
    model_provider: ModelProvider = ModelProvider.MOCK
    foundry_project_endpoint: HttpUrl | None = None
    foundry_model: str | None = Field(default=None, min_length=1)
    azure_client_id: str | None = None

    @model_validator(mode="after")
    def _require_foundry_config(self) -> Self:
        if self.model_provider is ModelProvider.FOUNDRY and not (
            self.foundry_project_endpoint and self.foundry_model
        ):
            msg = (
                "FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_MODEL are required "
                "when MODEL_PROVIDER=foundry"
            )
            raise ValueError(msg)
        if self.model_provider is ModelProvider.MOCK and self.app_env is AppEnvironment.PROD:
            msg = "MODEL_PROVIDER=mock is not permitted in prod"
            raise ValueError(msg)
        return self
