"""Service-side slice of the spec §28 state machine. SCHEDULED onwards belongs to the worker."""

from typing import Final

from matchiq_agents.contracts.types import PipelineStatus

S = PipelineStatus

TRANSITIONS: Final[dict[PipelineStatus, frozenset[PipelineStatus]]] = {
    S.DETECTED: frozenset({S.ANALYZED, S.REJECTED}),
    S.ANALYZED: frozenset({S.DRAFTED, S.FALLBACK, S.REJECTED}),
    S.DRAFTED: frozenset({S.DRAFTED, S.VERIFIED, S.FALLBACK, S.REJECTED}),
    S.VERIFIED: frozenset({S.FALLBACK}),
    S.FALLBACK: frozenset({S.REJECTED}),
    S.REJECTED: frozenset(),
}

TERMINAL_FOR_SERVICE: Final = frozenset({S.VERIFIED, S.FALLBACK, S.REJECTED})


class IllegalTransitionError(RuntimeError):
    pass


def can_transition(current: PipelineStatus, target: PipelineStatus) -> bool:
    return target in TRANSITIONS.get(current, frozenset())


def ensure_transition(current: PipelineStatus, target: PipelineStatus) -> PipelineStatus:
    if not can_transition(current, target):
        raise IllegalTransitionError(f"{current.value} -> {target.value}")
    return target
