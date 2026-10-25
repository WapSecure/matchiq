"""Per-request dependencies shared by the agents in the roster."""

from dataclasses import dataclass, field
from typing import Final

from matchiq_agents.contracts.types import AgentName, AgentRun, Persona, RunOutcome, RunProvider
from matchiq_agents.domain.facts import FactView
from matchiq_agents.guard.safety import ContentSafetyScreen
from matchiq_agents.pipeline.recorder import RunRecord
from matchiq_agents.pipeline.runner import ModelRunner
from matchiq_agents.pipeline.steps import StepRecorder
from matchiq_agents.roster.compact import prompt_for
from matchiq_agents.roster.modes import PromptMode
from matchiq_agents.roster.prompts import Prompt
from matchiq_agents.templates.fallback import TEMPLATE_VERSION, TemplateFallback

DETERMINISTIC_CHECKS_VERSION: Final = "1.0.0"


@dataclass(frozen=True, slots=True)
class AgentContext:
    view: FactView
    runner: ModelRunner
    fallback: TemplateFallback
    critique_enabled: bool
    safety: ContentSafetyScreen | None = None
    recorder: StepRecorder = field(kw_only=True)
    prompt_mode: PromptMode = field(default=PromptMode.STANDARD, kw_only=True)

    def prompt(self, agent: AgentName) -> Prompt:
        return prompt_for(self.prompt_mode, agent)

    @property
    def compact(self) -> bool:
        return self.prompt_mode is PromptMode.COMPACT

    @property
    def canonical_personas(self) -> tuple[Persona, ...]:
        """Requested personas plus BROADCAST, which the Broadcast Producer always needs."""
        personas = self.view.personas
        return personas if Persona.BROADCAST in personas else (*personas, Persona.BROADCAST)

    def local_run(
        self,
        agent: AgentName,
        outcome: RunOutcome = RunOutcome.FALLBACK,
        version: str = TEMPLATE_VERSION,
        started_ms: float | None = None,
    ) -> AgentRun:
        """A run executed without a model: template output or deterministic checks."""
        clock = self.runner.clock
        now_ms = clock.monotonic_ms()
        record = RunRecord(
            agent=agent,
            provider=RunProvider.template,
            prompt_version=version,
            started_at=clock.now(),
            latency_ms=now_ms - (started_ms if started_ms is not None else now_ms),
            outcome=outcome,
        )
        return self.runner.scope.record(record)
