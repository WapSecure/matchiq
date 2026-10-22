"""Localization Specialist (spec §27, §28): approved en-GB drafts → fr-FR / es-ES / pcm-NG.

One model call translates every agent-written draft into every requested locale (ADR-0011
addendum). Each translated item is checked on its own: evidence ids and cited values are copied
from the source draft, never from the model, and an item that changes a number or drops a proper
noun is replaced by that persona's template in the target locale, without discarding the others.
Template drafts are localised from templates and never sent to the model.
"""

from collections.abc import Sequence
from typing import Final

from pydantic import ValidationError

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
from matchiq_agents.roster.convert import cited_refs, facts_payload, text_pairs, tidy
from matchiq_agents.roster.prompts import LOCALIZATION
from matchiq_agents.roster.schemas import LocalizationInput, LocalizationOutput, LocalizedOut

NOTHING_ACCEPTED: Final = "no localised item passed checks"

ItemKey = tuple[Persona, Locale]


def serve_original(draft: NarrativeDraft, locale: Locale) -> NarrativeDraft:
    return draft.model_copy(update={"locale": locale, "localeFallback": True})


def _translated(
    item: LocalizedOut, source: NarrativeDraft, ctx: AgentContext
) -> NarrativeDraft | None:
    try:
        target = NarrativeDraft.model_validate(
            {
                **source.model_dump(),
                "locale": Locale(item.locale),
                "headline": tidy(item.headline, ctx.view.entity_names),
                "body": tidy(item.body, ctx.view.entity_names),
                "source": NarrativeSource.AGENT,
            }
        )
    except ValidationError:
        return None
    return None if check_localised(source, target, ctx.view) else target


def _accept(
    output: LocalizationOutput,
    sources: Sequence[NarrativeDraft],
    targets: Sequence[Locale],
    ctx: AgentContext,
) -> dict[ItemKey, NarrativeDraft]:
    """Keeps every item that passes; a call with no usable item counts as a failed attempt."""
    by_persona = {draft.persona: draft for draft in sources}
    accepted: dict[ItemKey, NarrativeDraft] = {}
    for item in output.drafts:
        key = (Persona(item.persona), Locale(item.locale))
        source = by_persona.get(key[0])
        if source is None or key[1] not in targets or key in accepted:
            continue
        target = _translated(item, source, ctx)
        if target is not None:
            accepted[key] = target
    if not accepted:
        raise ValueError(NOTHING_ACCEPTED)
    return accepted


def _fallback_item(ctx: AgentContext, source: NarrativeDraft, locale: Locale) -> NarrativeDraft:
    """The persona's template in `locale` when it states the same numbers and names as the source
    (spec §27); otherwise the en-GB source text, flagged `localeFallback`."""
    target = ctx.fallback.draft(source.persona, locale)
    ok = not check_localised(source, target, ctx.view)
    return target if ok else serve_original(source, locale)


async def _translate(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], targets: Sequence[Locale]
) -> tuple[dict[ItemKey, NarrativeDraft], AgentRun]:
    payload = LocalizationInput(
        facts=facts_payload(ctx.view, free_text=False, metric_refs=cited_refs(sources)),
        source_locale=CANONICAL_LOCALE,
        target_locales=list(targets),
        drafts=text_pairs(sources),
        protected_terms=ctx.view.prompt_entities,
    )
    call = ModelCall(
        prompt=LOCALIZATION,
        payload=payload,
        response_model=LocalizationOutput,
        convert=lambda output: _accept(output, sources, targets, ctx),
    )
    accepted, run = await ctx.runner.run(call)
    return accepted or {}, run


async def localise_all(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], locales: Sequence[Locale]
) -> tuple[list[NarrativeDraft], tuple[AgentRun, ...]]:
    """Every requested locale, in request order; en-GB is the source drafts themselves."""
    targets = [locale for locale in locales if locale is not CANONICAL_LOCALE]
    agent_sources = [draft for draft in sources if draft.source is NarrativeSource.AGENT]
    runs: list[AgentRun] = []
    translated: dict[ItemKey, NarrativeDraft] = {}
    if targets and agent_sources:
        translated, run = await _translate(ctx, agent_sources, targets)
        runs.append(run)
    localised: list[NarrativeDraft] = []
    used_template = False
    for locale in locales:
        if locale is CANONICAL_LOCALE:
            localised += sources
            continue
        for source in sources:
            draft = translated.get((source.persona, locale))
            if draft is None:
                draft = _fallback_item(ctx, source, locale)
                used_template = True
            localised.append(draft)
    if used_template:
        runs.append(ctx.local_run(LOCALIZATION.agent))
    return localised, tuple(runs)
