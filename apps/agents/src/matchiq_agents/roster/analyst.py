"""Match Analyst (spec §28): evidence → grounded observation and inference claims."""

from collections.abc import Sequence

from matchiq_agents.contracts.types import AgentName, AgentResult, AgentRun, Issue
from matchiq_agents.domain.relevance import ranked_refs
from matchiq_agents.guard.checks import check_analysis
from matchiq_agents.guard.repair import Repair
from matchiq_agents.pipeline import diagnostics, reasons
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, to_analysis
from matchiq_agents.roster.notes import revision_notes
from matchiq_agents.roster.prompts import MATCH_ANALYST
from matchiq_agents.roster.repairs import repair_claim, repair_limitation
from matchiq_agents.roster.schemas import AnalystInput, AnalystOutput

UNGROUNDED = "analysis failed deterministic checks: {issues}"


def analyst_payload(ctx: AgentContext, issues: Sequence[Issue] = ()) -> AnalystInput:
    """The top metrics for the insight kind and subject; the checks keep the full evidence."""
    view = ctx.view
    refs = set(ranked_refs(view.metrics, view.kind, view.subject_side))
    return AnalystInput(
        facts=facts_payload(view, metric_refs=refs, context=True),
        revision_notes=revision_notes(issues),
    )


def repaired(output: AnalystOutput, ctx: AgentContext, log: list[Repair]) -> AnalystOutput:
    view = ctx.view
    claims = [repair_claim(claim, view, index, log) for index, claim in enumerate(output.claims)]
    limitations = [
        repair_limitation(text, view, index, log) for index, text in enumerate(output.limitations)
    ]
    return output.model_copy(update={"claims": claims, "limitations": limitations})


def _accept(output: AnalystOutput, ctx: AgentContext, log: list[Repair]) -> AgentResult:
    analysis = to_analysis(repaired(output, ctx, log), ctx.view)
    issues = check_analysis(analysis, ctx.view)
    if issues or not analysis.claims:
        run_id = ctx.runner.scope.run_id
        diagnostics.report(run_id, MATCH_ANALYST.agent, issues)
        if not analysis.claims:
            diagnostics.report_failure(run_id, MATCH_ANALYST.agent, diagnostics.NO_CLAIMS)
        detail = UNGROUNDED.format(issues=[found.code.value for found in issues])
        raise diagnostics.OutputRejectedError(detail, issues)
    return analysis


async def analyse(ctx: AgentContext) -> tuple[AgentResult, tuple[AgentRun, ...], str | None]:
    if not ctx.runner.fits(MATCH_ANALYST.agent, AgentName.NARRATIVE_WRITER):
        skipped = ctx.local_run(MATCH_ANALYST.agent)
        return ctx.fallback.analysis(), (skipped,), reasons.ANALYST_SKIPPED
    log: list[Repair] = []
    call = ModelCall(
        prompt=MATCH_ANALYST,
        payload=analyst_payload(ctx),
        response_model=AnalystOutput,
        convert=lambda output: _accept(output, ctx, log),
        repairs=log,
        revise=lambda issues: analyst_payload(ctx, issues),
    )
    analysis, run = await ctx.runner.run(call)
    if analysis is not None:
        return analysis, (run,), None
    template_run = ctx.local_run(MATCH_ANALYST.agent)
    return ctx.fallback.analysis(), (run, template_run), reasons.ANALYST_FALLBACK
