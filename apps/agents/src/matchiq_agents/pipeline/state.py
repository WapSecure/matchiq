"""Typed, immutable run state passed between workflow executors (spec §46 shared state)."""

from dataclasses import dataclass, field, replace
from enum import StrEnum

from matchiq_agents.contracts.types import (
    AgentResult,
    AgentRun,
    NarrativeDraft,
    OverlayProposal,
    Persona,
    PipelineStatus,
    VerificationResult,
)
from matchiq_agents.pipeline.fsm import ensure_transition


class Route(StrEnum):
    VERIFY = "verify"
    REVISE = "revise"
    LOCALISE = "localise"
    FALLBACK = "fallback"
    FINALISE = "finalise"


@dataclass(frozen=True, slots=True)
class PipelineState:
    status: PipelineStatus = PipelineStatus.DETECTED
    route: Route = Route.VERIFY
    history: tuple[PipelineStatus, ...] = (PipelineStatus.DETECTED,)
    analysis: AgentResult | None = None
    canonical: tuple[NarrativeDraft, ...] = ()
    localised: tuple[NarrativeDraft, ...] = ()
    verification: VerificationResult | None = None
    overlay: OverlayProposal | None = None
    draft_attempts: int = 0
    revision_notes: tuple[str, ...] = ()
    # Personas the Fact Checker sent back; empty means the writer drafts every persona.
    revision_personas: tuple[Persona, ...] = ()
    fallback_reasons: tuple[str, ...] = ()
    runs: tuple[AgentRun, ...] = field(default=())

    def advance(self, target: PipelineStatus, route: Route) -> "PipelineState":
        status = ensure_transition(self.status, target)
        return replace(self, status=status, route=route, history=(*self.history, status))

    def with_runs(self, *runs: AgentRun) -> "PipelineState":
        return replace(self, runs=(*self.runs, *runs))

    def with_fallback(self, reason: str) -> "PipelineState":
        return replace(self, fallback_reasons=(*self.fallback_reasons, reason))
