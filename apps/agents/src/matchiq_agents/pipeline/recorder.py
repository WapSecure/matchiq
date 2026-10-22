"""Builds `AgentRun` trace records (AI_AGENT_GOVERNANCE.md rule 6)."""

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from matchiq_agents.contracts.types import AgentName, AgentRun, RunOutcome, RunProvider
from matchiq_agents.guard.repair import Repair
from matchiq_agents.limits import MAX_REPAIRS, REPAIR_DETAIL_MAX


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
    prompt_hash: str | None = None
    cost_estimate_usd: float | None = None
    repairs: tuple[Repair, ...] = field(default=())


@dataclass(frozen=True, slots=True)
class RunScope:
    run_id: str
    correlation_id: UUID

    def record(self, record: RunRecord) -> AgentRun:
        optional = {
            "modelDeployment": record.model_deployment,
            "tokensIn": record.tokens_in,
            "tokensOut": record.tokens_out,
            "promptHash": record.prompt_hash,
            "costEstimateUsd": record.cost_estimate_usd,
            "repairs": [
                {"code": r.code, "detail": r.detail[:REPAIR_DETAIL_MAX]}
                for r in record.repairs[:MAX_REPAIRS]
            ]
            or None,
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
