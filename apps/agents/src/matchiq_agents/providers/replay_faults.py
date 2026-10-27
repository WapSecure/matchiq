"""Demo faults on a replay (ADR-0020, ADR-0042).

`WRITER_REVISE` corrupts one recorded draft with a citation the engine never computed. The Fact
Checker then catches it, and the revision is the recorded draft itself, so the fix is real model
wording and the catch is the live check. No number inside a recording is edited.
"""

from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.types import CitedValue, NarrativeDraft, PipelineResult
from matchiq_agents.faults.constants import (
    INJECTED_METRIC_REF,
    INJECTED_VALUE,
    NOTE_CORRUPTED,
)
from matchiq_agents.faults.model import FaultInjectingModel
from matchiq_agents.faults.orchestrator import label_runs
from matchiq_agents.models.mock import MockModel


def corrupt_first(drafts: list[NarrativeDraft]) -> tuple[list[NarrativeDraft], str | None]:
    if not drafts:
        return drafts, None
    first = drafts[0]
    injected = CitedValue(metricRef=INJECTED_METRIC_REF, value=INJECTED_VALUE)
    altered = first.model_copy(update={"citedValues": [*first.citedValues, injected]})
    return [altered, *drafts[1:]], NOTE_CORRUPTED.format(persona=first.persona.value.lower())


def label_faulted(
    result: PipelineResult,
    scenario: FaultScenario,
    corruption_note: str | None,
    revision_notes: tuple[str, ...],
) -> PipelineResult:
    """Marks every run as part of a simulated failure, with the notes of the steps it caused."""
    carrier = FaultInjectingModel(MockModel(), scenario)
    carrier.corruption_note = corruption_note
    carrier.revision_notes = revision_notes
    return result.model_copy(update={"runs": label_runs(carrier, list(result.runs))})
