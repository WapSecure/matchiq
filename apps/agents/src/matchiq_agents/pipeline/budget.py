"""Central per-run budget (spec §46): agent hops, total tokens and estimated cost.

The orchestrator creates one per run and shares it with the model runner. Once a limit is
reached, every further model call is refused and each stage falls back to its deterministic
template, so an exhausted budget degrades the run instead of failing it.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Final


class BudgetLimit(StrEnum):
    HOPS = "hops"
    TOKENS = "tokens"
    COST = "cost"


@dataclass(frozen=True, slots=True)
class BudgetLimits:
    max_hops: int
    max_tokens: int
    max_cost_usd: float


UNLIMITED: Final = BudgetLimits(max_hops=2**31, max_tokens=2**62, max_cost_usd=float("inf"))


@dataclass(slots=True)
class RunBudget:
    limits: BudgetLimits = field(default=UNLIMITED)
    hops: int = 0
    tokens: int = 0
    cost_usd: float = 0.0
    refusals: int = 0

    def hop(self) -> None:
        self.hops += 1

    def charge(self, tokens_in: int | None, tokens_out: int | None, cost_usd: float | None) -> None:
        self.tokens += (tokens_in or 0) + (tokens_out or 0)
        self.cost_usd += cost_usd or 0.0

    @property
    def exceeded(self) -> BudgetLimit | None:
        if self.hops > self.limits.max_hops:
            return BudgetLimit.HOPS
        if self.tokens >= self.limits.max_tokens:
            return BudgetLimit.TOKENS
        if self.cost_usd >= self.limits.max_cost_usd:
            return BudgetLimit.COST
        return None

    def allow(self) -> bool:
        """Whether another model call may start; a refusal is counted for the step record."""
        if self.exceeded is None:
            return True
        self.refusals += 1
        return False
