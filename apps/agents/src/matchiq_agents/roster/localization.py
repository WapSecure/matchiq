"""Localization Specialist (spec §27, §28): approved en-GB drafts → fr-FR / es-ES / pcm-NG.

One model call translates every agent-written draft into every requested locale (ADR-0011
addendum). Each translated item is checked on its own: evidence ids and cited values are copied
from the source draft, never from the model, and an item that changes a number or drops a proper
noun is replaced by that persona's template in the target locale, without discarding the others.
Template drafts are localised from templates and never sent to the model.

The payload lists every required (locale, persona) item and the output is checked against it:
each item the model left out is reported and, when the deadline allows, requested once more in a
smaller follow-up call; whatever is still missing falls back per item like a rejected one.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

from pydantic import ValidationError

from matchiq_agents.contracts.types import (
    AgentName,
    AgentRun,
    Locale,
    NarrativeDraft,
    NarrativeSource,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE
from matchiq_agents.guard.locale_checks import check_localised
from matchiq_agents.guard.repair import Repair
from matchiq_agents.pipeline import diagnostics
from matchiq_agents.pipeline.runner import ModelCall
from matchiq_agents.roster.context import AgentContext
from matchiq_agents.roster.convert import cited_refs, facts_payload, text_pairs, tidy
from matchiq_agents.roster.prompts import LOCALIZATION
from matchiq_agents.roster.repairs import repair_body, repair_text
from matchiq_agents.roster.schemas import LocalizationInput, LocalizationOutput, LocalizedOut

NOTHING_ACCEPTED: Final = "no localised item passed checks"

ItemKey = tuple[Persona, Locale]


def serve_original(draft: NarrativeDraft, locale: Locale) -> NarrativeDraft:
    return draft.model_copy(update={"locale": locale, "localeFallback": True})


def _repaired(
    item: LocalizedOut, source: NarrativeDraft, ctx: AgentContext, log: list[Repair]
) -> tuple[str, str]:
    locale, values = Locale(item.locale), [value.value for value in source.citedValues]
    tag = f"{item.locale} {item.persona}"
    names = ctx.view.entity_names
    headline = repair_text(
        tidy(item.headline, names), ctx.view, values, f"{tag} headline", log, locale
    )
    body = repair_text(tidy(item.body, names), ctx.view, values, f"{tag} body", log, locale)
    return headline, repair_body(body, source.persona, f"{tag} body", log)


def _translated(
    item: LocalizedOut, source: NarrativeDraft, ctx: AgentContext, log: list[Repair]
) -> NarrativeDraft | None:
    run_id, persona, locale = ctx.runner.scope.run_id, source.persona, Locale(item.locale)
    item_log: list[Repair] = []
    headline, body = _repaired(item, source, ctx, item_log)
    try:
        target = NarrativeDraft.model_validate(
            {
                **source.model_dump(),
                "locale": locale,
                "headline": headline,
                "body": body,
                "source": NarrativeSource.AGENT,
            }
        )
    except ValidationError:
        diagnostics.report_item(run_id, LOCALIZATION.agent, persona, locale)
        return None
    issues = check_localised(source, target, ctx.view)
    text = f"{target.headline}\n{target.body}"
    diagnostics.report(
        run_id, LOCALIZATION.agent, issues, persona=persona, locale=locale, text=text
    )
    if issues:
        return None
    log.extend(item_log)
    return target


@dataclass(frozen=True, slots=True)
class _Batch:
    accepted: dict[ItemKey, NarrativeDraft]
    absent: tuple[ItemKey, ...]


def required_items(sources: Sequence[NarrativeDraft], targets: Sequence[Locale]) -> list[ItemKey]:
    """Every (persona, locale) item the call must return, locale by locale."""
    return [(draft.persona, locale) for locale in targets for draft in sources]


def _accept(
    output: LocalizationOutput,
    sources: Sequence[NarrativeDraft],
    required: Sequence[ItemKey],
    ctx: AgentContext,
    log: list[Repair],
) -> _Batch:
    """Keeps every item that passes and reports each required item the output left out; a call
    with no usable item counts as a failed attempt."""
    by_persona = {draft.persona: draft for draft in sources}
    wanted = set(required)
    returned: set[ItemKey] = set()
    accepted: dict[ItemKey, NarrativeDraft] = {}
    for item in output.drafts:
        key = (Persona(item.persona), Locale(item.locale))
        if key not in wanted or key in accepted:
            continue
        returned.add(key)
        target = _translated(item, by_persona[key[0]], ctx, log)
        if target is not None:
            accepted[key] = target
    absent = tuple(key for key in required if key not in returned)
    for persona, locale in absent:
        diagnostics.report_missing(ctx.runner.scope.run_id, LOCALIZATION.agent, persona, locale)
    if not accepted:
        raise diagnostics.OutputRejectedError(NOTHING_ACCEPTED)
    return _Batch(accepted, absent)


def _fallback_item(ctx: AgentContext, source: NarrativeDraft, locale: Locale) -> NarrativeDraft:
    """The persona's template in `locale` when it states the same numbers and names as the source
    (spec §27); otherwise the en-GB source text, flagged `localeFallback`."""
    target = ctx.fallback.draft(source.persona, locale)
    ok = not check_localised(source, target, ctx.view)
    return target if ok else serve_original(source, locale)


async def _translate(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], required: Sequence[ItemKey]
) -> tuple[_Batch | None, AgentRun]:
    personas = {persona for persona, _ in required}
    drafts = [draft for draft in sources if draft.persona in personas]
    payload = LocalizationInput.model_validate(
        {
            "facts": facts_payload(ctx.view, free_text=False, metric_refs=cited_refs(drafts)),
            "sourceLocale": CANONICAL_LOCALE,
            "targetLocales": list(dict.fromkeys(locale for _, locale in required)),
            "drafts": text_pairs(drafts),
            "requiredItems": [
                {"locale": locale.value, "persona": persona.value} for persona, locale in required
            ],
            "protectedTerms": ctx.view.prompt_entities,
        }
    )
    log: list[Repair] = []
    call = ModelCall(
        prompt=LOCALIZATION,
        payload=payload,
        response_model=LocalizationOutput,
        convert=lambda output: _accept(output, drafts, required, ctx, log),
        repairs=log,
    )
    return await ctx.runner.run(call)


async def _translate_all(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], targets: Sequence[Locale]
) -> tuple[dict[ItemKey, NarrativeDraft], list[AgentRun]]:
    """One batched call; items it left out get one follow-up call when the deadline allows."""
    batch, run = await _translate(ctx, sources, required_items(sources, targets))
    runs = [run]
    if batch is None:
        return {}, runs
    translated = dict(batch.accepted)
    if batch.absent and ctx.runner.fits(LOCALIZATION.agent, AgentName.BROADCAST_PRODUCER):
        retry, run = await _translate(ctx, sources, batch.absent)
        runs.append(run)
        translated.update(retry.accepted if retry is not None else {})
    return translated, runs


async def localise_all(
    ctx: AgentContext, sources: Sequence[NarrativeDraft], locales: Sequence[Locale]
) -> tuple[list[NarrativeDraft], tuple[AgentRun, ...]]:
    """Every requested locale and persona, in request order; en-GB is the source drafts.

    BROADCAST is drafted for the overlay even when no BROADCAST narrative was requested; only
    requested personas are translated.
    """
    targets = [locale for locale in locales if locale is not CANONICAL_LOCALE]
    sources = [draft for draft in sources if draft.persona in ctx.view.personas]
    agent_sources = [draft for draft in sources if draft.source is NarrativeSource.AGENT]
    runs: list[AgentRun] = []
    translated: dict[ItemKey, NarrativeDraft] = {}
    if targets and agent_sources:
        translated, runs = await _translate_all(ctx, agent_sources, targets)
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
