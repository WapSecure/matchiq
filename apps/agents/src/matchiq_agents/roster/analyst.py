"""Match Analyst (spec §28): evidence → grounded observation and inference claims."""

from matchiq_agents.contracts.types import AgentResult, AgentRun
from matchiq_agents.guard.checks import check_analysis
from matchiq_agents.pipeline import reasons
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, to_analysis
from matchiq_agents.roster.prompts import MATCH_ANALYST
from matchiq_agents.roster.schemas import AnalystOutput

UNGROUNDED = "analysis failed deterministic checks: {issues}"


def _accept(output: AnalystOutput, ctx: AgentContext) -> AgentResult:
    analysis = to_analysis(output, ctx.view)
    issues = check_analysis(analysis, ctx.view)
    if issues or not analysis.claims:
        raise ValueError(UNGROUNDED.format(issues=[found.code.value for found in issues]))
    return analysis


async def analyse(ctx: AgentContext) -> tuple[AgentResult, tuple[AgentRun, ...], str | None]:
    call = ModelCall(
        prompt=MATCH_ANALYST,
        payload=facts_payload(ctx.view),
        response_model=AnalystOutput,
        convert=lambda output: _accept(output, ctx),
    )
    analysis, run = await ctx.runner.run(call)
    if analysis is not None:
        return analysis, (run,), None
    template_run = ctx.local_run(MATCH_ANALYST.agent)
    return ctx.fallback.analysis(), (run, template_run), reasons.ANALYST_FALLBACK
