"""One span per agent step, named and attributed per the OTel GenAI semantic conventions.

Without a configured tracer provider (ADR-0019) the API tracer is a no-op, so this costs nothing.
The span is a child of the request span, whose parent is the worker's `traceparent`.
"""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Final

from opentelemetry import trace
from opentelemetry.trace import Span

from matchiq_agents.contracts.types import AgentStep, AgentStepRole

TRACER_NAME: Final = "matchiq_agents.pipeline"
SPAN_NAME: Final = "invoke_agent {role}"
OPERATION: Final = "invoke_agent"
GENAI: Final = {
    "operation": "gen_ai.operation.name",
    "agent": "gen_ai.agent.name",
    "system": "gen_ai.system",
    "model": "gen_ai.request.model",
    "input_tokens": "gen_ai.usage.input_tokens",
    "output_tokens": "gen_ai.usage.output_tokens",
}
MATCHIQ: Final = {
    "correlation_id": "matchiq.correlation_id",
    "run_id": "matchiq.run_id",
    "step_index": "matchiq.step.index",
    "decision": "matchiq.step.decision",
    "reason_code": "matchiq.step.reason_code",
    "input_checksum": "matchiq.step.input_checksum",
    "prompt_version": "matchiq.agent.prompt_version",
    "cost_usd": "matchiq.step.cost_estimate_usd",
}


@contextmanager
def agent_step_span(role: AgentStepRole, correlation_id: str, run_id: str) -> Generator[Span]:
    tracer = trace.get_tracer(TRACER_NAME)
    with tracer.start_as_current_span(SPAN_NAME.format(role=role.value)) as span:
        span.set_attributes(
            {
                GENAI["operation"]: OPERATION,
                GENAI["agent"]: role.value,
                MATCHIQ["correlation_id"]: correlation_id,
                MATCHIQ["run_id"]: run_id,
            }
        )
        yield span


def annotate(span: Span, step: AgentStep) -> None:
    if not span.is_recording():
        return
    attributes: dict[str, str | int | float] = {
        GENAI["system"]: step.provider.value,
        MATCHIQ["step_index"]: step.stepIndex,
        MATCHIQ["decision"]: step.decision.value,
        MATCHIQ["reason_code"]: step.reasonCode,
        MATCHIQ["input_checksum"]: step.inputChecksum,
        MATCHIQ["prompt_version"]: step.agentVersion.promptVersion,
    }
    optional = {
        GENAI["model"]: step.modelDeployment,
        GENAI["input_tokens"]: step.tokensIn,
        GENAI["output_tokens"]: step.tokensOut,
        MATCHIQ["cost_usd"]: step.costEstimateUsd,
    }
    attributes.update({key: value for key, value in optional.items() if value is not None})
    span.set_attributes(attributes)
