"""Test doubles for the model port and the clock."""

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime

from pydantic import BaseModel

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, RunProvider
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelOutputError, ModelUsage

FIXED_NOW = datetime(2026, 10, 21, 20, 0, tzinfo=UTC)


class FakeClock:
    def __init__(self) -> None:
        self.now_ms = 0.0
        self.sleeps: list[float] = []

    def monotonic_ms(self) -> float:
        return self.now_ms

    def now(self) -> datetime:
        return FIXED_NOW

    async def sleep_ms(self, duration_ms: float) -> None:
        self.sleeps.append(duration_ms)
        self.now_ms += duration_ms

    def advance(self, duration_ms: float) -> None:
        self.now_ms += duration_ms


Override = Callable[[BaseModel, int], BaseModel | Exception | None]


class ScriptedModel:
    """Delegates to MockModel unless a per-agent override answers first.

    An override receives the mock's answer and the call number for that agent. It returns a
    replacement answer, an exception to raise, or None to keep the mock's answer. The provider is
    reported as `foundry` so tests can tell scripted runs from templates.
    """

    def __init__(self, overrides: dict[AgentName, Override] | None = None) -> None:
        self._mock = MockModel()
        self._overrides = overrides or {}
        self.calls: dict[AgentName, int] = {}

    @property
    def provider(self) -> RunProvider:
        return RunProvider.foundry

    @property
    def deployment(self) -> str | None:
        return "scripted-test"

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        count = self.calls.get(agent_name, 0) + 1
        self.calls[agent_name] = count
        answer, _ = await self._mock.generate(
            agent_name, instructions, payload, response_model, deadline
        )
        override = self._overrides.get(agent_name)
        replaced = override(answer, count) if override else None
        if isinstance(replaced, Exception):
            raise replaced
        final = replaced if replaced is not None else answer
        usage = ModelUsage(self.provider, self.deployment, tokens_in=10, tokens_out=5)
        return response_model.model_validate(final.model_dump()), usage


class FailingModel:
    """Every call fails, as during a Foundry outage."""

    def __init__(self, error: Exception | None = None) -> None:
        self.error = error or ModelOutputError("outage")
        self.calls = 0

    @property
    def provider(self) -> RunProvider:
        return RunProvider.foundry

    @property
    def deployment(self) -> str | None:
        return "unavailable"

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        self.calls += 1
        raise self.error


class HangingModel(FailingModel):
    """Never answers within the deadline."""

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        self.calls += 1
        await asyncio.sleep(3600)
        raise AssertionError("unreachable")
