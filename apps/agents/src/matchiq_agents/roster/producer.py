"""Broadcast Producer (spec §26, §28): verified broadcast draft → overlay proposal.

Kind, priority and duration are deterministic policy derived from the insight; the model only
condenses copy. Any overlay that fails the deterministic checks is replaced by the template.
"""

from matchiq_agents.contracts.types import AgentRun, NarrativeDraft, OverlayProposal
from matchiq_agents.guard.checks import check_overlay
from matchiq_agents.guard.repair import Repair
from matchiq_agents.limits import OVERLAY_LIMITS
from matchiq_agents.pipeline import diagnostics, reasons
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import cited_refs, facts_payload, text_pairs, to_overlay
from matchiq_agents.roster.notes import revision_notes
from matchiq_agents.roster.prompts import BROADCAST_PRODUCER
from matchiq_agents.roster.repairs import overlay_refs, repair_body, repair_text
from matchiq_agents.roster.schemas import ProducerInput, ProducerOutput

FAILED_CHECKS = "overlay failed checks: {codes}"


def _accept(
    output: ProducerOutput, ctx: AgentContext, broadcast: NarrativeDraft, log: list[Repair]
) -> OverlayProposal:
    cited = {value.metricRef: value.value for value in broadcast.citedValues}
    values = list(cited.values())
    headline = repair_text(output.headline, ctx.view, values, "overlay headline", log)
    body = repair_text(output.body, ctx.view, values, "overlay body", log)
    body = repair_body(body, None, "overlay body", log)
    refs = overlay_refs(f"{headline}\n{body}", output.metric_refs, cited, log)
    overlay = to_overlay(headline, body, refs, ctx.view)
    issues = check_overlay(overlay, ctx.view)
    if issues:
        text = f"{overlay.headline}\n{overlay.body}"
        diagnostics.report(ctx.runner.scope.run_id, BROADCAST_PRODUCER.agent, issues, text=text)
        codes = [found.code.value for found in issues]
        raise diagnostics.OutputRejectedError(FAILED_CHECKS.format(codes=codes), issues)
    return overlay


async def produce(
    ctx: AgentContext, broadcast: NarrativeDraft, *, use_template: bool
) -> tuple[OverlayProposal, tuple[AgentRun, ...], str | None]:
    if use_template:
        return ctx.fallback.overlay(), (ctx.local_run(BROADCAST_PRODUCER.agent),), None
    payload = ProducerInput(
        facts=facts_payload(ctx.view, free_text=False, metric_refs=cited_refs([broadcast])),
        broadcast_draft=text_pairs([broadcast])[0],
        headline_max=OVERLAY_LIMITS.headline_max,
        body_max=OVERLAY_LIMITS.body_max,
        revision_notes=[],
    )
    log: list[Repair] = []
    call = ModelCall(
        prompt=BROADCAST_PRODUCER,
        payload=payload,
        response_model=ProducerOutput,
        convert=lambda output: _accept(output, ctx, broadcast, log),
        repairs=log,
        revise=lambda issues: payload.model_copy(update={"revision_notes": revision_notes(issues)}),
    )
    overlay, run = await ctx.runner.run(call)
    if overlay is not None:
        return overlay, (run,), None
    template_run = ctx.local_run(BROADCAST_PRODUCER.agent)
    return ctx.fallback.overlay(), (run, template_run), reasons.PRODUCER_FALLBACK
