"""Wires the model port and orchestrator from validated settings."""

from matchiq_agents.clock import Clock
from matchiq_agents.constants import (
    DEADLINE_RESERVE_MS,
    MIN_MODEL_CALL_MS,
    PER_CALL_DEADLINE_SHARE,
    RETRY_BACKOFF_BASE_MS,
    WORKFLOW_GRACE_MS,
)
from matchiq_agents.contracts.types import RunProvider
from matchiq_agents.models.agent_framework import AgentFrameworkModel
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy
from matchiq_agents.pipeline.orchestrator import PipelineConfig, PipelineOrchestrator
from matchiq_agents.providers.foundry import FoundryNotConfiguredError, build_chat_client
from matchiq_agents.providers.ollama import OllamaNotConfiguredError, build_ollama_client
from matchiq_agents.settings import ModelProvider, Settings


def build_model(settings: Settings) -> ModelPort:
    match settings.model_provider:
        case ModelProvider.MOCK:
            return MockModel()
        case ModelProvider.OLLAMA:
            if settings.ollama_model is None:
                raise OllamaNotConfiguredError("OLLAMA_MODEL must be configured")
            deployment = f"{ModelProvider.OLLAMA.value}/{settings.ollama_model}"
            return AgentFrameworkModel(
                build_ollama_client(settings), RunProvider.ollama, deployment
            )
        case ModelProvider.FOUNDRY:
            if settings.foundry_model is None:
                raise FoundryNotConfiguredError("FOUNDRY_MODEL must be configured")
            return AgentFrameworkModel(
                build_chat_client(settings), RunProvider.foundry, settings.foundry_model
            )


def pipeline_config(settings: Settings) -> PipelineConfig:
    retry = RetryPolicy(
        max_retries=settings.agent_max_retries,
        backoff_base_ms=RETRY_BACKOFF_BASE_MS,
        per_call_share=PER_CALL_DEADLINE_SHARE,
        reserve_ms=DEADLINE_RESERVE_MS,
        min_call_ms=MIN_MODEL_CALL_MS,
    )
    return PipelineConfig(
        retry=retry, critique_enabled=settings.agent_critique_enabled, grace_ms=WORKFLOW_GRACE_MS
    )


def build_orchestrator(
    settings: Settings, clock: Clock, model: ModelPort | None = None
) -> PipelineOrchestrator:
    breaker = CircuitBreaker(
        clock, settings.agent_circuit_failure_threshold, settings.agent_circuit_reset_ms
    )
    return PipelineOrchestrator(
        model or build_model(settings), breaker, clock, pipeline_config(settings)
    )
