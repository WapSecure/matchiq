"""The roster as an Agent Framework graph workflow (ADR-0011).

analyst → writer → fact_checker ─PASS──→ localization → producer → finalise
             ↑          │ ╰─REJECT─→ fallback ─┬─────↗
             ╰─REVISE───╯   writer failure ──↗  ╰─suppressed─→ finalise
"""

from collections.abc import Callable
from typing import Final

from agent_framework import Workflow, WorkflowBuilder

from matchiq_agents.pipeline.executors import (
    AnalystExecutor,
    FactCheckerExecutor,
    FallbackExecutor,
    FinaliseExecutor,
    LocalizationExecutor,
    ProducerExecutor,
    WriterExecutor,
)
from matchiq_agents.pipeline.state import PipelineState, Route
from matchiq_agents.roster.context import AgentContext

WORKFLOW_NAME: Final = "matchiq-insight-pipeline"
# Analyst, two writer/checker rounds, fallback, localization, producer, finalise, plus headroom.
MAX_SUPERSTEPS: Final = 16


def routes_to(*routes: Route) -> Callable[[object], bool]:
    def condition(message: object) -> bool:
        return isinstance(message, PipelineState) and message.route in routes

    return condition


def build_workflow(agents: AgentContext) -> Workflow:
    """A fresh graph per request: Agent Framework forbids concurrent runs of one instance."""
    analyst = AnalystExecutor(agents, "match_analyst")
    writer = WriterExecutor(agents, "narrative_writer")
    checker = FactCheckerExecutor(agents, "fact_checker")
    fallback = FallbackExecutor(agents, "template_fallback")
    localizer = LocalizationExecutor(agents, "localization")
    producer = ProducerExecutor(agents, "broadcast_producer")
    finalise = FinaliseExecutor(agents, "finalise")
    return (
        WorkflowBuilder(
            max_iterations=MAX_SUPERSTEPS,
            name=WORKFLOW_NAME,
            start_executor=analyst,
            output_from=[finalise],
        )
        .add_edge(analyst, writer)
        .add_edge(writer, checker, condition=routes_to(Route.VERIFY))
        .add_edge(writer, fallback, condition=routes_to(Route.FALLBACK))
        .add_edge(checker, writer, condition=routes_to(Route.REVISE))
        .add_edge(checker, localizer, condition=routes_to(Route.LOCALISE))
        .add_edge(checker, fallback, condition=routes_to(Route.FALLBACK))
        .add_edge(fallback, localizer, condition=routes_to(Route.LOCALISE))
        .add_edge(fallback, finalise, condition=routes_to(Route.FINALISE))
        .add_edge(localizer, producer)
        .add_edge(producer, finalise)
        .build()
    )
