"""Length and timing limits. Contract maxima mirror `libs/contracts/src/lib/constants.ts`."""

from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import AgentName, InsightPriority, Persona

NARRATIVE_HEADLINE_MAX: Final = 80
NARRATIVE_BODY_MAX: Final = 600
OVERLAY_HEADLINE_MAX: Final = 60
OVERLAY_BODY_MAX: Final = 140
CASUAL_BODY_MAX: Final = 200
CLAIM_TEXT_MAX: Final = 400
LIMITATION_MAX: Final = 200
MAX_AGENT_RETRIES: Final = 2
MAX_DRAFT_ATTEMPTS: Final = 2
MAX_REPAIRS: Final = 16
REPAIR_DETAIL_MAX: Final = 160


@dataclass(frozen=True, slots=True)
class TextLimits:
    headline_max: int
    body_max: int
    max_sentences: int | None = None


PERSONA_LIMITS: Final[dict[Persona, TextLimits]] = {
    Persona.CASUAL: TextLimits(NARRATIVE_HEADLINE_MAX, CASUAL_BODY_MAX, max_sentences=1),
    Persona.ANALYST: TextLimits(NARRATIVE_HEADLINE_MAX, NARRATIVE_BODY_MAX),
    Persona.BROADCAST: TextLimits(OVERLAY_HEADLINE_MAX, OVERLAY_BODY_MAX),
}

OVERLAY_LIMITS: Final = TextLimits(OVERLAY_HEADLINE_MAX, OVERLAY_BODY_MAX)

# Spec §27: broadcast overlays are on screen for 6-10 seconds.
OVERLAY_DURATION_MS: Final[dict[InsightPriority, int]] = {
    InsightPriority.P0: 10_000,
    InsightPriority.P1: 8_000,
    InsightPriority.P2: 6_000,
}

OVERLAY_PRIORITY: Final[dict[InsightPriority, int]] = {
    InsightPriority.P0: 90,
    InsightPriority.P1: 70,
    InsightPriority.P2: 50,
}

# Output-token caps per call. Truncated JSON fails to parse, so each cap leaves headroom over
# the measured output (ADR-0011 addendum); the batched Localization call writes up to
# 3 locales x 3 personas.
MAX_OUTPUT_TOKENS: Final[dict[AgentName, int]] = {
    AgentName.MATCH_ANALYST: 900,
    AgentName.NARRATIVE_WRITER: 900,
    AgentName.FACT_CHECKER: 300,
    AgentName.LOCALIZATION: 2_400,
    AgentName.BROADCAST_PRODUCER: 300,
}
