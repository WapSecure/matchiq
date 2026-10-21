"""The single seam between agents and any model backend (ARCHITECTURE_RULES.md: ports)."""

from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, RunProvider


@dataclass(frozen=True, slots=True)
class ModelUsage:
    provider: RunProvider
    model_deployment: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None


class ModelOutputError(RuntimeError):
    """The model answered, but not with output that parses into the response model."""


class ModelPort(Protocol):
    @property
    def provider(self) -> RunProvider: ...

    @property
    def deployment(self) -> str | None: ...

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]: ...
