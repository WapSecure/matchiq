"""Stable names for the generated contract classes the pipeline uses.

The generator emits one module per root schema, so shared shapes (for example `Locale`) exist as
distinct classes in several modules. Inputs come from `PipelineRequest`, outputs from
`PipelineResult`; never mix the two families inside one model.
"""

from matchiq_agents.contracts.generated.PipelineRequest import Direction as TrendDirection
from matchiq_agents.contracts.generated.PipelineRequest import (
    Entities,
    Evidence,
    Insight,
    MomentContext,
    Packet,
    PipelineRequest,
    ScoreState,
)
from matchiq_agents.contracts.generated.PipelineRequest import Kind as InsightKind
from matchiq_agents.contracts.generated.PipelineRequest import Metric as ContextMetric
from matchiq_agents.contracts.generated.PipelineRequest import Phase as MinutePhase
from matchiq_agents.contracts.generated.PipelineRequest import Priority as InsightPriority
from matchiq_agents.contracts.generated.PipelineResult import (
    Agent as AgentName,
)
from matchiq_agents.contracts.generated.PipelineResult import (
    AgentStep,
    AgentStepDecision,
    AgentStepRole,
    AnalystBreakdown,
    BreakdownPart,
    CitedValue,
    Claim,
    ClaimType,
    ConfidenceLabel,
    EvidenceEventId,
    Issue,
    Locale,
    MetricRef,
    NarrativeDraft,
    OverlayProposal,
    Persona,
    PipelineResult,
    Verdict,
)
from matchiq_agents.contracts.generated.PipelineResult import (
    Analysis as AgentResult,
)
from matchiq_agents.contracts.generated.PipelineResult import Code as IssueCode
from matchiq_agents.contracts.generated.PipelineResult import Kind as OverlayKind
from matchiq_agents.contracts.generated.PipelineResult import Outcome as RunOutcome
from matchiq_agents.contracts.generated.PipelineResult import Provider as RunProvider
from matchiq_agents.contracts.generated.PipelineResult import Run as AgentRun
from matchiq_agents.contracts.generated.PipelineResult import Source as NarrativeSource
from matchiq_agents.contracts.generated.PipelineResult import Status as PipelineStatus
from matchiq_agents.contracts.generated.PipelineResult import (
    Verification as VerificationResult,
)

__all__ = [
    "AgentName",
    "AgentResult",
    "AgentRun",
    "AgentStep",
    "AgentStepDecision",
    "AgentStepRole",
    "AnalystBreakdown",
    "BreakdownPart",
    "CitedValue",
    "Claim",
    "ClaimType",
    "ConfidenceLabel",
    "ContextMetric",
    "Entities",
    "Evidence",
    "EvidenceEventId",
    "Insight",
    "InsightKind",
    "InsightPriority",
    "Issue",
    "IssueCode",
    "Locale",
    "MetricRef",
    "MinutePhase",
    "MomentContext",
    "NarrativeDraft",
    "NarrativeSource",
    "OverlayKind",
    "OverlayProposal",
    "Packet",
    "Persona",
    "PipelineRequest",
    "PipelineResult",
    "PipelineStatus",
    "RunOutcome",
    "RunProvider",
    "ScoreState",
    "TrendDirection",
    "Verdict",
    "VerificationResult",
]
