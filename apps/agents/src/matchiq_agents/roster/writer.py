"""Narrative Writer (spec §28): canonical en-GB persona drafts from the analyst's claims.

Every persona comes from one structured call. A revision asks only for the personas the Fact
Checker sent back; drafts that already passed are kept.
"""

from collections.abc import Sequence

from matchiq_agents.contracts.types import (
    AgentResult,
    AgentRun,
    NarrativeDraft,
    NarrativeSource,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.guard.repair import Repair
from matchiq_agents.pipeline import diagnostics
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, named, to_drafts
from matchiq_agents.roster.prompts import NARRATIVE_WRITER
from matchiq_agents.roster.repairs import repair_draft
from matchiq_agents.roster.schemas import ClaimOut, WriterInput, WriterOutput


def writer_input(
    ctx: AgentContext, analysis: AgentResult, notes: Sequence[str], personas: Sequence[Persona]
) -> WriterInput:
    return WriterInput(
        facts=facts_payload(
            ctx.view,
            free_text=False,
            metric_refs={v.metricRef for claim in analysis.claims for v in claim.citedValues},
        ),
        claims=[
            ClaimOut.model_validate(claim.model_dump(mode="json")) for claim in analysis.claims
        ],
        limitations=[limitation.root for limitation in analysis.limitations],
        personas=list(personas),
        locale=CANONICAL_LOCALE,
        revision_notes=list(notes),
    )


def merge_drafts(
    ctx: AgentContext, kept: Sequence[NarrativeDraft], fresh: Sequence[NarrativeDraft]
) -> tuple[NarrativeDraft, ...]:
    """Fresh drafts replace kept ones per persona; the result follows the canonical order."""
    by_persona = {draft.persona: draft for draft in (*kept, *fresh)}
    return tuple(by_persona[p] for p in ctx.canonical_personas if p in by_persona)


async def write(
    ctx: AgentContext,
    analysis: AgentResult,
    notes: Sequence[str],
    personas: Sequence[Persona],
) -> tuple[list[NarrativeDraft] | None, AgentRun]:
    log: list[Repair] = []
    call = ModelCall(
        prompt=NARRATIVE_WRITER,
        payload=writer_input(ctx, analysis, notes, personas),
        response_model=WriterOutput,
        convert=lambda output: to_drafts(
            [
                repair_draft(named(draft, ctx.view.entity_names), ctx.view, log)
                for draft in output.drafts
            ],
            personas,
            CANONICAL_LOCALE,
            NarrativeSource.AGENT,
            lambda persona: diagnostics.report_item(
                ctx.runner.scope.run_id, NARRATIVE_WRITER.agent, persona
            ),
        ),
        repairs=log,
    )
    return await ctx.runner.run(call)
