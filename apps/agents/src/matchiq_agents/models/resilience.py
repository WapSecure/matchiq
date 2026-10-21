"""Retry policy and the circuit breaker shared by model calls (AI_AGENT_GOVERNANCE.md rule 4)."""

from dataclasses import dataclass
from enum import StrEnum

from matchiq_agents.clock import Clock


class BreakerState(StrEnum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_retries: int
    backoff_base_ms: float
    per_call_share: float
    reserve_ms: float
    min_call_ms: float


class CircuitBreaker:
    """Opens after `failure_threshold` consecutive failures; one trial call after `reset_ms`."""

    def __init__(self, clock: Clock, failure_threshold: int, reset_ms: float) -> None:
        self._clock = clock
        self._threshold = failure_threshold
        self._reset_ms = reset_ms
        self._failures = 0
        self._opened_at: float | None = None
        self._trial_in_flight = False

    @property
    def state(self) -> BreakerState:
        if self._opened_at is None:
            return BreakerState.CLOSED
        if self._clock.monotonic_ms() - self._opened_at >= self._reset_ms:
            return BreakerState.HALF_OPEN
        return BreakerState.OPEN

    def allow(self) -> bool:
        state = self.state
        if state is BreakerState.CLOSED:
            return True
        if state is BreakerState.HALF_OPEN and not self._trial_in_flight:
            self._trial_in_flight = True
            return True
        return False

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._trial_in_flight = False

    def release(self) -> None:
        """Ends a half-open trial that never reached the model, without judging its health."""
        self._trial_in_flight = False

    def record_failure(self) -> None:
        self._failures += 1
        if self._trial_in_flight or self._failures >= self._threshold:
            self._opened_at = self._clock.monotonic_ms()
        self._trial_in_flight = False
