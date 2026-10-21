"""Narrative Writer (spec §28): canonical en-GB persona drafts from the analyst's claims."""

from collections.abc import Sequence

from matchiq_agents.contracts.types import AgentResult, AgentRun, NarrativeDraft, NarrativeSource
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, to_drafts
from matchiq_agents.roster.prompts import NARRATIVE_WRITER
from matchiq_agents.roster.schemas import ClaimOut, WriterInput, WriterOutput


def writer_input(ctx: AgentContext, analysis: AgentResult, notes: Sequence[str]) -> WriterInput:
    return WriterInput(
        facts=facts_payload(ctx.view),
        claims=[
            ClaimOut.model_validate(claim.model_dump(mode="json")) for claim in analysis.claims
        ],
        personas=list(ctx.canonical_personas),
        locale=CANONICAL_LOCALE,
        revision_notes=list(notes),
    )


async def write(
    ctx: AgentContext, analysis: AgentResult, notes: Sequence[str]
) -> tuple[list[NarrativeDraft] | None, AgentRun]:
    personas = ctx.canonical_personas
    call = ModelCall(
        prompt=NARRATIVE_WRITER,
        payload=writer_input(ctx, analysis, notes),
        response_model=WriterOutput,
        convert=lambda output: to_drafts(
            output.drafts, personas, CANONICAL_LOCALE, NarrativeSource.AGENT
        ),
    )
    return await ctx.runner.run(call)
