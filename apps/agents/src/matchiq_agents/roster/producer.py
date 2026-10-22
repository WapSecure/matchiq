"""Broadcast Producer (spec §26, §28): verified broadcast draft → overlay proposal.

Kind, priority and duration are deterministic policy derived from the insight; the model only
condenses copy. Any overlay that fails the deterministic checks is replaced by the template.
"""

from matchiq_agents.contracts.types import AgentRun, NarrativeDraft, OverlayProposal
from matchiq_agents.guard.checks import check_overlay
from matchiq_agents.limits import OVERLAY_LIMITS
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, text_pairs, to_overlay
from matchiq_agents.roster.prompts import BROADCAST_PRODUCER
from matchiq_agents.roster.schemas import ProducerInput, ProducerOutput

FAILED_CHECKS = "overlay failed checks: {codes}"


def _accept(output: ProducerOutput, ctx: AgentContext) -> OverlayProposal:
    overlay = to_overlay(output.headline, output.body, output.metric_refs, ctx.view)
    issues = check_overlay(overlay, ctx.view)
    if issues:
        raise ValueError(FAILED_CHECKS.format(codes=[found.code.value for found in issues]))
    return overlay


async def produce(
    ctx: AgentContext, broadcast: NarrativeDraft, *, use_template: bool
) -> tuple[OverlayProposal, tuple[AgentRun, ...], str | None]:
    if use_template:
        return ctx.fallback.overlay(), (ctx.local_run(BROADCAST_PRODUCER.agent),), None
    payload = ProducerInput(
        facts=facts_payload(ctx.view, free_text=False),
        broadcast_draft=text_pairs([broadcast])[0],
        headline_max=OVERLAY_LIMITS.headline_max,
        body_max=OVERLAY_LIMITS.body_max,
    )
    call = ModelCall(
        prompt=BROADCAST_PRODUCER,
        payload=payload,
        response_model=ProducerOutput,
        convert=lambda output: _accept(output, ctx),
    )
    overlay, run = await ctx.runner.run(call)
    if overlay is not None:
        return overlay, (run,), None
    template_run = ctx.local_run(BROADCAST_PRODUCER.agent)
    return ctx.fallback.overlay(), (run, template_run), reasons.PRODUCER_FALLBACK
