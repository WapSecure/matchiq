"""Wires the model port and orchestrator from validated settings."""

from matchiq_agents.clock import Clock
from matchiq_agents.constants import (
    DEADLINE_RESERVE_MS,
    LOCAL_AGENT_DEADLINE_SHARES,
    LOCAL_FEEDBACK_MIN_SHARE,
    LOCAL_FEEDBACK_RETRIES,
    LOCAL_PER_CALL_DEADLINE_SHARE,
    LOCAL_WORKFLOW_GRACE_MS,
    MIN_MODEL_CALL_MS,
    PER_CALL_DEADLINE_SHARE,
    RETRY_BACKOFF_BASE_MS,
    WORKFLOW_GRACE_MS,
)
from matchiq_agents.contracts.types import RunProvider
from matchiq_agents.models.agent_framework import AgentFrameworkModel
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.models.pricing import PriceTable
from matchiq_agents.models.resilience import CircuitBreaker, RetryPolicy, StageTimer
from matchiq_agents.pipeline.orchestrator import PipelineConfig, PipelineOrchestrator
from matchiq_agents.providers.foundry import FoundryNotConfiguredError, build_chat_client
from matchiq_agents.providers.ollama import (
    OLLAMA_RUN_OPTIONS,
    OllamaNotConfiguredError,
    build_ollama_client,
)
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
                build_ollama_client(settings),
                RunProvider.ollama,
                deployment,
                run_options=OLLAMA_RUN_OPTIONS,
            )
        case ModelProvider.FOUNDRY:
            if settings.foundry_model is None:
                raise FoundryNotConfiguredError("FOUNDRY_MODEL must be configured")
            return AgentFrameworkModel(
                build_chat_client(settings), RunProvider.foundry, settings.foundry_model
            )


def retry_policy(settings: Settings) -> RetryPolicy:
    if not settings.is_local:
        return RetryPolicy(
            max_retries=settings.agent_max_retries,
            output_retries=settings.agent_max_retries,
            backoff_base_ms=RETRY_BACKOFF_BASE_MS,
            per_call_share=PER_CALL_DEADLINE_SHARE,
            reserve_ms=DEADLINE_RESERVE_MS,
            min_call_ms=MIN_MODEL_CALL_MS,
        )
    # Local slow lane (ADR-0011 addenda): no blind retries, one retry with the violations fed
    # back while enough of the deadline is left, and a per-agent cap so a slow Analyst cannot
    # starve the Writer and Localization, which produce the narratives.
    return RetryPolicy(
        max_retries=settings.agent_max_retries,
        output_retries=0,
        backoff_base_ms=RETRY_BACKOFF_BASE_MS,
        per_call_share=LOCAL_PER_CALL_DEADLINE_SHARE,
        reserve_ms=DEADLINE_RESERVE_MS,
        min_call_ms=MIN_MODEL_CALL_MS,
        agent_shares=LOCAL_AGENT_DEADLINE_SHARES,
        retry_timeouts=False,
        feedback_retries=min(LOCAL_FEEDBACK_RETRIES, settings.agent_max_retries),
        feedback_min_share=LOCAL_FEEDBACK_MIN_SHARE,
        plan_stages=True,
    )


def pipeline_config(settings: Settings) -> PipelineConfig:
    retry = retry_policy(settings)
    return PipelineConfig(
        retry=retry,
        critique_enabled=settings.critique_enabled,
        grace_ms=LOCAL_WORKFLOW_GRACE_MS if settings.is_local else WORKFLOW_GRACE_MS,
        prices=PriceTable(settings.agent_price_table),
    )


def build_orchestrator(
    settings: Settings,
    clock: Clock,
    model: ModelPort | None = None,
    timer: StageTimer | None = None,
) -> PipelineOrchestrator:
    breaker = CircuitBreaker(
        clock,
        settings.agent_circuit_failure_threshold,
        settings.agent_circuit_reset_ms,
        settings.circuit_timeout_threshold,
    )
    return PipelineOrchestrator(
        model or build_model(settings), breaker, clock, pipeline_config(settings), timer
    )
