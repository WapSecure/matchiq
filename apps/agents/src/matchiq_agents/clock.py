"""Injectable time source so retries, deadlines and the circuit breaker are testable."""

import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

MS_PER_SECOND = 1000


class Clock(Protocol):
    def monotonic_ms(self) -> float: ...

    def now(self) -> datetime: ...

    async def sleep_ms(self, duration_ms: float) -> None: ...


class SystemClock:
    def monotonic_ms(self) -> float:
        return time.monotonic() * MS_PER_SECOND

    def now(self) -> datetime:
        return datetime.now(UTC)

    async def sleep_ms(self, duration_ms: float) -> None:
        await asyncio.sleep(duration_ms / MS_PER_SECOND)


@dataclass(frozen=True, slots=True)
class Deadline:
    clock: Clock
    expires_at_ms: float

    @classmethod
    def after(cls, clock: Clock, budget_ms: float) -> "Deadline":
        return cls(clock=clock, expires_at_ms=clock.monotonic_ms() + budget_ms)

    def remaining_ms(self) -> float:
        return max(0.0, self.expires_at_ms - self.clock.monotonic_ms())

    @property
    def expired(self) -> bool:
        return self.remaining_ms() <= 0
