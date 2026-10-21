"""Localization Specialist (spec §27, §28): approved en-GB drafts → fr-FR / es-ES.

Evidence ids and cited values are copied from the source draft, never from the model. When a
translation changes a number or drops a proper noun, the en-GB text is served with
`localeFallback=true`.
"""

from collections.abc import Sequence

from matchiq_agents.contracts.types import (
    AgentRun,
    Locale,
    NarrativeDraft,
    NarrativeSource,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.guard.locale_checks import check_localised
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import facts_payload, text_pairs
from matchiq_agents.roster.prompts import LOCALIZATION
from matchiq_agents.roster.schemas import LocalizationInput, LocalizationOutput

FAILED_CHECKS = "localised draft failed checks: {codes}"
MISSING = "localised output is missing persona {persona}"


def serve_original(drafts: Sequence[NarrativeDraft], locale: Locale) -> list[NarrativeDraft]:
    return [draft.model_copy(update={"locale": locale, "localeFallback": True}) for draft in drafts]


def _accept(
    output: LocalizationOutput, sources: Sequence[NarrativeDraft], locale: Locale, ctx: AgentContext
) -> list[NarrativeDraft]:
    by_persona = {Persona(item.persona): item for item in output.drafts}
    accepted: list[NarrativeDraft] = []
    for source in sources:
        item = by_persona.get(source.persona)
        if item is None:
            raise ValueError(MISSING.format(persona=source.persona.value))
        target = NarrativeDraft.model_validate(
            {
                **source.model_dump(),
                "locale": locale,
                "headline": item.headline,
                "body": item.body,
                "source": NarrativeSource.AGENT,
            }
        )
        issues = check_localised(source, target, ctx.view)
        if issues:
            raise ValueError(FAILED_CHECKS.format(codes=[found.code.value for found in issues]))
        accepted.append(target)
    return accepted


def _template(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], locale: Locale
) -> list[NarrativeDraft]:
    localised: list[NarrativeDraft] = []
    for source in sources:
        target = ctx.fallback.draft(source.persona, locale)
        ok = not check_localised(source, target, ctx.view)
        localised.append(target if ok else serve_original([source], locale)[0])
    return localised


async def localise(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], locale: Locale, *, use_template: bool
) -> tuple[list[NarrativeDraft], tuple[AgentRun, ...]]:
    if locale is CANONICAL_LOCALE:
        return list(sources), ()
    if use_template:
        return _template(ctx, sources, locale), (ctx.local_run(LOCALIZATION.agent),)
    payload = LocalizationInput(
        facts=facts_payload(ctx.view),
        source_locale=CANONICAL_LOCALE,
        target_locale=locale,
        drafts=text_pairs(sources),
        protected_terms=sorted(ctx.view.entity_names),
    )
    call = ModelCall(
        prompt=LOCALIZATION,
        payload=payload,
        response_model=LocalizationOutput,
        convert=lambda output: _accept(output, sources, locale, ctx),
    )
    drafts, run = await ctx.runner.run(call)
    return (drafts if drafts is not None else serve_original(sources, locale)), (run,)
