from enum import StrEnum
from typing import Self

from pydantic import Field, HttpUrl, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from matchiq_agents.constants import (
    BUDGET_HOPS_MAX,
    DEFAULT_APP_VERSION,
    DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
    DEFAULT_CIRCUIT_RESET_MS,
    DEFAULT_OLLAMA_ENDPOINT,
    DEFAULT_OLLAMA_KEEP_ALIVE,
    DEFAULT_OLLAMA_MODEL,
    DEFAULT_PORT,
    DEFAULT_RUN_BUDGET,
    LOCAL_CIRCUIT_TIMEOUT_THRESHOLD,
    OLLAMA_KEEP_ALIVE_PATTERN,
    SECRET_MIN_LENGTH,
)
from matchiq_agents.limits import MAX_AGENT_RETRIES
from matchiq_agents.models.pricing import Price
from matchiq_agents.pipeline.budget import BudgetLimits
from matchiq_agents.roster.modes import PromptMode


class ModelProvider(StrEnum):
    MOCK = "mock"
    OLLAMA = "ollama"
    FOUNDRY = "foundry"


class AppEnvironment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGE = "stage"
    PROD = "prod"


class Settings(BaseSettings):
    """Validated service configuration. Variable names follow Agent Framework conventions."""

    # Blank values copied from `.env.example` (for example `FOUNDRY_MODEL=`) mean "unset".
    model_config = SettingsConfigDict(extra="ignore", frozen=True, env_ignore_empty=True)

    app_env: AppEnvironment = AppEnvironment.LOCAL
    app_version: str = DEFAULT_APP_VERSION
    agents_port: int = Field(default=DEFAULT_PORT, ge=1, le=65_535)
    agents_service_token: SecretStr = Field(min_length=SECRET_MIN_LENGTH)
    model_provider: ModelProvider = ModelProvider.MOCK
    foundry_project_endpoint: HttpUrl | None = None
    foundry_model: str | None = Field(default=None, min_length=1)
    azure_client_id: str | None = None
    ollama_endpoint: HttpUrl | None = HttpUrl(DEFAULT_OLLAMA_ENDPOINT)
    ollama_model: str | None = Field(default=DEFAULT_OLLAMA_MODEL, min_length=1)
    ollama_keep_alive: str = Field(
        default=DEFAULT_OLLAMA_KEEP_ALIVE, pattern=OLLAMA_KEEP_ALIVE_PATTERN
    )
    ollama_warmup: bool = True
    agent_prompt_mode: PromptMode = PromptMode.STANDARD
    agent_max_retries: int = Field(default=MAX_AGENT_RETRIES, ge=0, le=MAX_AGENT_RETRIES)
    agent_circuit_failure_threshold: int = Field(default=DEFAULT_CIRCUIT_FAILURE_THRESHOLD, ge=1)
    agent_circuit_reset_ms: int = Field(default=DEFAULT_CIRCUIT_RESET_MS, ge=1)
    agent_circuit_timeout_threshold: int | None = Field(default=None, ge=1)
    # Unset: on for cloud providers, off for ollama (ADR-0011 addendum). The deterministic Fact
    # Checker always runs.
    agent_critique_enabled: bool | None = None
    # JSON: {"<deployment>": {"inputPerMTok": 0.15, "outputPerMTok": 0.6}} in USD. Local
    # inference costs 0; a cloud deployment missing here gets no estimate (docs/ai/EVALUATION.md).
    agent_price_table: dict[str, Price] = Field(default_factory=dict[str, Price])
    # Central per-run budget (spec §46); exceeding it falls back with BUDGET_EXCEEDED.
    agent_budget_max_hops: int = Field(
        default=DEFAULT_RUN_BUDGET.max_hops, ge=1, le=BUDGET_HOPS_MAX
    )
    agent_budget_max_tokens: int = Field(default=DEFAULT_RUN_BUDGET.max_tokens, ge=1)
    agent_budget_max_cost_usd: float = Field(default=DEFAULT_RUN_BUDGET.max_cost_usd, gt=0)
    # Honours `PipelineRequest.fault` (ADR-0020). Simulated failures only; refused in prod.
    demo_faults_enabled: bool = False

    @property
    def run_budget(self) -> BudgetLimits:
        return BudgetLimits(
            max_hops=self.agent_budget_max_hops,
            max_tokens=self.agent_budget_max_tokens,
            max_cost_usd=self.agent_budget_max_cost_usd,
        )

    @property
    def is_local(self) -> bool:
        return self.model_provider is ModelProvider.OLLAMA

    @property
    def critique_enabled(self) -> bool:
        if self.agent_critique_enabled is not None:
            return self.agent_critique_enabled
        return not self.is_local

    @property
    def circuit_timeout_threshold(self) -> int | None:
        """None: timeouts count as ordinary failures (cloud providers)."""
        if self.agent_circuit_timeout_threshold is not None:
            return self.agent_circuit_timeout_threshold
        return LOCAL_CIRCUIT_TIMEOUT_THRESHOLD if self.is_local else None

    @model_validator(mode="after")
    def _require_provider_config(self) -> Self:
        if self.model_provider is ModelProvider.FOUNDRY and not (
            self.foundry_project_endpoint and self.foundry_model
        ):
            msg = (
                "FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_MODEL are required "
                "when MODEL_PROVIDER=foundry"
            )
            raise ValueError(msg)
        if self.model_provider is ModelProvider.OLLAMA and not (
            self.ollama_endpoint and self.ollama_model
        ):
            msg = "OLLAMA_ENDPOINT and OLLAMA_MODEL are required when MODEL_PROVIDER=ollama"
            raise ValueError(msg)
        if self.model_provider is ModelProvider.MOCK and self.app_env is AppEnvironment.PROD:
            msg = "MODEL_PROVIDER=mock is not permitted in prod"
            raise ValueError(msg)
        if self.demo_faults_enabled and self.app_env is AppEnvironment.PROD:
            msg = "DEMO_FAULTS_ENABLED is not permitted in prod"
            raise ValueError(msg)
        return self
