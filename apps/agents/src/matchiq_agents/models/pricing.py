"""Per-run cost estimates from a configurable price table (spec §51 cost telemetry).

Local inference and the mock cost nothing. A cloud deployment without a configured price is
"unknown" (no estimate), never zero: an estimate must not under-report spend.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Final

from pydantic import BaseModel, ConfigDict, Field

from matchiq_agents.contracts.types import RunProvider

TOKENS_PER_MILLION: Final = 1_000_000
COST_DECIMALS: Final = 6
FREE_PROVIDERS: Final = frozenset({RunProvider.ollama, RunProvider.mock, RunProvider.template})


class Price(BaseModel):
    """USD per million tokens, as cloud price lists quote them."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    input_per_mtok: float = Field(ge=0, alias="inputPerMTok")
    output_per_mtok: float = Field(ge=0, alias="outputPerMTok")


@dataclass(frozen=True, slots=True)
class PriceTable:
    by_deployment: Mapping[str, Price]

    def estimate(
        self,
        provider: RunProvider,
        deployment: str | None,
        tokens_in: int | None,
        tokens_out: int | None,
    ) -> float | None:
        if provider in FREE_PROVIDERS:
            return 0.0
        price = self.by_deployment.get(deployment or "")
        if price is None or tokens_in is None or tokens_out is None:
            return None
        cost = (
            tokens_in * price.input_per_mtok + tokens_out * price.output_per_mtok
        ) / TOKENS_PER_MILLION
        return round(cost, COST_DECIMALS)


EMPTY_PRICES: Final = PriceTable({})
