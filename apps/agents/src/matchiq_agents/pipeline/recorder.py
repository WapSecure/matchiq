"""Builds `AgentRun` trace records (AI_AGENT_GOVERNANCE.md rule 6)."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from matchiq_agents.contracts.types import AgentName, AgentRun, RunOutcome, RunProvider


@dataclass(frozen=True, slots=True)
class RunRecord:
    agent: AgentName
    provider: RunProvider
    prompt_version: str
    started_at: datetime
    latency_ms: float
    outcome: RunOutcome
    retries: int = 0
    model_deployment: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None


@dataclass(frozen=True, slots=True)
class RunScope:
    run_id: str
    correlation_id: UUID

    def record(self, record: RunRecord) -> AgentRun:
        optional = {
            "modelDeployment": record.model_deployment,
            "tokensIn": record.tokens_in,
            "tokensOut": record.tokens_out,
        }
        return AgentRun.model_validate(
            {
                "runId": self.run_id,
                "correlationId": self.correlation_id,
                "agent": record.agent,
                "provider": record.provider,
                "promptVersion": record.prompt_version,
                "startedAt": record.started_at,
                "latencyMs": max(0, round(record.latency_ms)),
                "retries": record.retries,
                "outcome": record.outcome,
                **{key: value for key, value in optional.items() if value is not None},
            }
        )
