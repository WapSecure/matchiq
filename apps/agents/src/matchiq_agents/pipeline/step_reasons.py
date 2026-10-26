"""Decision codes and short reasons for `AgentStep` records. The web maps codes to persona copy."""

from collections.abc import Iterable, Sequence
from typing import Final

from matchiq_agents.contracts.types import AgentStepDecision, Issue, Persona
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.steps import StepOutcome

D = AgentStepDecision

GROUNDED: Final = StepOutcome(D.PASS, "GROUNDED", "analysis grounded in the evidence")
ANALYST_SKIPPED: Final = StepOutcome(D.FALLBACK, "TIME_BUDGET", reasons.ANALYST_SKIPPED)
ANALYST_FALLBACK: Final = StepOutcome(D.FALLBACK, "MODEL_FALLBACK", reasons.ANALYST_FALLBACK)
DRAFTED: Final = StepOutcome(D.PASS, "DRAFTED", "drafts handed to the fact checker")
WRITER_FALLBACK: Final = StepOutcome(D.FALLBACK, "MODEL_FALLBACK", reasons.WRITER_FALLBACK)
VERIFIED: Final = StepOutcome(D.PASS, "VERIFIED", "every draft matched the evidence")
REVISION: Final = "sent {personas} back for a rewrite ({codes})"
TEMPLATES_PASSED: Final = StepOutcome(
    D.FALLBACK, "TEMPLATE_USED", "templates filled the drafts that did not pass"
)
TEMPLATES_FAILED: Final = StepOutcome(D.REJECT, "TEMPLATE_FAILED", reasons.TEMPLATE_FAILED)
LOCALISED: Final = StepOutcome(D.PASS, "LOCALISED", "translations kept every number and name")
LOCALE_FALLBACK: Final = StepOutcome(
    D.FALLBACK, "LOCALE_FALLBACK", "some translations were replaced by templates"
)
OVERLAY_READY: Final = StepOutcome(D.PASS, "OVERLAY_READY", "overlay copy passed the checks")
OVERLAY_TEMPLATE: Final = StepOutcome(
    D.FALLBACK, "TEMPLATE_USED", "overlay built from the template broadcast draft"
)
OVERLAY_FALLBACK: Final = StepOutcome(D.FALLBACK, "OVERLAY_FALLBACK", reasons.PRODUCER_FALLBACK)
EMERGENCY: Final = StepOutcome(D.FALLBACK, "ORCHESTRATION_ERROR", reasons.ORCHESTRATION_ERROR)
NO_RECORDING: Final = StepOutcome(D.FALLBACK, "TEMPLATE_USED", reasons.NO_RECORDING)


def _codes(issues: Sequence[Issue]) -> str:
    return ", ".join(sorted({found.code.value for found in issues}))


def revision(personas: Iterable[Persona], issues: Sequence[Issue]) -> StepOutcome:
    names = ", ".join(sorted(persona.value for persona in personas)) or "every draft"
    detail = REVISION.format(personas=names, codes=_codes(issues))
    return StepOutcome(D.REVISE, "REVISION_REQUESTED", detail)


def rejected(reason: str) -> StepOutcome:
    return StepOutcome(D.REJECT, "DRAFTS_REJECTED", reason)
