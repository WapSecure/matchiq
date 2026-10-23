from typing import Final

# A metric the engine never computes, so the Fact Checker always flags the citation.
INJECTED_METRIC_REF: Final = "fault.injected"
INJECTED_VALUE: Final = 99.0

SIMULATED_TIMEOUT: Final = "simulated model timeout (demo fault plan)"
NOTE_CORRUPTED: Final = (
    "Simulated failure (demo): the {persona} draft was altered to cite "
    f"{INJECTED_METRIC_REF} = {INJECTED_VALUE:g}, a value the engine never computed"
)
NOTE_REVISE: Final = "Fact Checker returned REVISE: {notes}"
NOTE_REVISION: Final = "Constrained revision of the rejected persona only"
NOTE_TIMEOUT: Final = "Simulated failure (demo): every model call raised a timeout"
NOTE_SHORT_CIRCUIT: Final = "Circuit breaker open: call refused without reaching the model"
REASON_BREAKER_OPEN: Final = "circuit breaker opened after simulated timeouts"
NOTES_SEPARATOR: Final = " | "
REASON_SEPARATOR: Final = "; "
NOTE_MAX: Final = 300
REASON_MAX: Final = 200
