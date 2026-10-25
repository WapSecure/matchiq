"""Compact prompts for slow local models (AGENT_PROMPT_MODE=compact, MQ-088).

Each compact prompt is its standard prompt with optional context removed, so the grounding rules,
output fields and evidence rules are the same text by construction. Versions are patch bumps
because `promptVersion` must be plain SemVer; the registry records each hash.
"""

from dataclasses import replace
from typing import Final

from matchiq_agents.contracts.types import AgentName
from matchiq_agents.roster.examples import MOMENT_EXAMPLES, compact
from matchiq_agents.roster.modes import PromptMode
from matchiq_agents.roster.prompts import MATCH_ANALYST, NARRATIVE_WRITER, PROMPTS, Prompt

KEPT_SPELLS: Final = ("context.trend.spell1",)
_SPELL_TEXT: Final = (
    "`context.trend.spell1` to `context.trend.spell3` count `trendMetric` in the last spells, "
    "oldest first."
)
_SPELL_COMPACT: Final = "`context.trend.spell1` counts `trendMetric` in the previous spell."
_MOMENT_EXAMPLES_TEXT: Final = f" Correct example per moment type: {compact(MOMENT_EXAMPLES)}"


def _without(prompt: Prompt, version: str, old: str, new: str) -> Prompt:
    if old not in prompt.instructions:
        raise ValueError(f"{prompt.agent.value} prompt no longer contains the text to compact")
    return replace(prompt, version=version, instructions=prompt.instructions.replace(old, new))


COMPACT_PROMPTS: Final = {
    AgentName.MATCH_ANALYST: _without(MATCH_ANALYST, "2.2.1", _SPELL_TEXT, _SPELL_COMPACT),
    AgentName.NARRATIVE_WRITER: _without(NARRATIVE_WRITER, "3.1.1", _MOMENT_EXAMPLES_TEXT, ""),
}


def prompt_for(mode: PromptMode, agent: AgentName) -> Prompt:
    if mode is PromptMode.COMPACT and agent in COMPACT_PROMPTS:
        return COMPACT_PROMPTS[agent]
    return PROMPTS[agent]
