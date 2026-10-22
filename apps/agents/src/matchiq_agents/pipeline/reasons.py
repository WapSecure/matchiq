"""`fallbackReason` texts. Kept short: the contract caps the joined reason at 200 characters."""

from collections.abc import Iterable, Sequence
from typing import Final

from matchiq_agents.contracts.types import Issue, Persona

ANALYST_FALLBACK: Final = "analyst: model output unavailable or ungrounded"
WRITER_FALLBACK: Final = "writer: model output unavailable"
REJECTED_DRAFTS: Final = "fact checker rejected drafts ({codes})"
REPLACED_PERSONAS: Final = "fact checker replaced {personas} with templates ({codes})"
PRODUCER_FALLBACK: Final = "producer: overlay failed checks"
TEMPLATE_FAILED: Final = "template output failed checks; suppressed"
ORCHESTRATION_ERROR: Final = "orchestration error; template output"
INTEGRITY_PREFIX: Final = "suppressed: "
SEPARATOR: Final = "; "
REASON_MAX: Final = 200


def rejected(issues: Sequence[Issue]) -> str:
    """Keeps the rejected drafts' issue codes visible after templates replace them."""
    codes = ", ".join(sorted({found.code.value for found in issues}))
    return REJECTED_DRAFTS.format(codes=codes)


def replaced(personas: Iterable[Persona], issues: Sequence[Issue]) -> str:
    """Some personas fell back to templates; the agent drafts that passed are still served."""
    names = ", ".join(sorted(persona.value for persona in personas))
    codes = ", ".join(sorted({found.code.value for found in issues}))
    return REPLACED_PERSONAS.format(personas=names, codes=codes)


def join_reasons(reasons: tuple[str, ...]) -> str | None:
    if not reasons:
        return None
    return SEPARATOR.join(dict.fromkeys(reasons))[:REASON_MAX]
