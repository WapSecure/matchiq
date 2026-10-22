from enum import StrEnum

from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

from matchiq_agents.constants import DEFAULT_APP_VERSION, SERVICE_NAME


class LogFormat(StrEnum):
    JSON = "json"
    PRETTY = "pretty"


class TelemetrySettings(BaseSettings):
    """Logging and tracing settings; the same variables the Node services read."""

    model_config = SettingsConfigDict(extra="ignore", frozen=True, env_ignore_empty=True)

    app_env: str = "local"
    app_version: str = DEFAULT_APP_VERSION
    log_level: str = "info"
    # Unset: pretty when APP_ENV=local, otherwise JSON.
    log_format: LogFormat | None = None
    # Unset: tracing is off and the OpenTelemetry SDK is never imported.
    otel_exporter_otlp_endpoint: HttpUrl | None = None
    otel_service_name: str = SERVICE_NAME

    @property
    def resolved_format(self) -> LogFormat:
        if self.log_format is not None:
            return self.log_format
        return LogFormat.PRETTY if self.app_env == "local" else LogFormat.JSON
