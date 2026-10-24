"""Deterministic grounding checks (AI_AGENT_GOVERNANCE.md rules 1-2); they run before critique."""

import re
from collections.abc import Iterable, Sequence

from matchiq_agents.contracts.types import (
    AgentResult,
    AnalystBreakdown,
    CitedValue,
    EvidenceEventId,
    Issue,
    IssueCode,
    Locale,
    NarrativeDraft,
    OverlayProposal,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.guard import messages
from matchiq_agents.guard.editorial import editorial_issues
from matchiq_agents.guard.editorial_breakdown import breakdown_editorial_issues, breakdown_parts
from matchiq_agents.guard.safety import unsafe_categories
from matchiq_agents.guard.text import (
    extract_numerals,
    forbidden_categories,
    suspect_counts,
    unknown_capitalised,
)
from matchiq_agents.limits import (
    BREAKDOWN_PART_MAX,
    OVERLAY_LIMITS,
    PERSONA_LIMITS,
    TextLimits,
)

_SENTENCE_END = re.compile(r"(?<=[.!?…])\s+")


def issue(code: IssueCode, detail: str, index: int | None = None) -> Issue:
    text = detail[: messages.DETAIL_MAX]
    return (
        Issue(code=code, detail=text)
        if index is None
        else Issue(code=code, detail=text, claimIndex=index)
    )


def check_citations(
    event_ids: Sequence[EvidenceEventId],
    cited: Sequence[CitedValue],
    view: FactView,
    index: int | None,
) -> list[Issue]:
    found: list[Issue] = []
    if not event_ids:
        found.append(issue(IssueCode.UNCITED_EVIDENCE, messages.UNCITED, index))
    citable_events = view.citable_event_ids
    citable = view.citable_metrics
    for event in event_ids:
        if event.root not in citable_events:
            detail = messages.UNKNOWN_EVENT.format(event_id=event.root)
            found.append(issue(IssueCode.UNCITED_EVIDENCE, detail, index))
    for value in cited:
        actual = citable.get(value.metricRef)
        if actual is None:
            detail = messages.UNKNOWN_METRIC.format(metric_ref=value.metricRef)
            found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail, index))
        elif value.value != actual:
            detail = messages.WRONG_VALUE.format(
                metric_ref=value.metricRef, cited=value.value, actual=actual
            )
            found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail, index))
    return found


def check_text(
    text: str, supported: Iterable[float], locale: Locale, view: FactView, index: int | None
) -> list[Issue]:
    values = list(supported)
    found: list[Issue] = []
    for numeral in extract_numerals(text, locale):
        # Digits only (prompt rule 6): a spelled number cannot be audited against the metric.
        if not numeral.raw[0].isdigit():
            detail = messages.SPELLED_NUMBER.format(raw=numeral.raw)
            found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail, index))
        elif not any(numeral.represents(value) for value in values):
            detail = messages.UNSUPPORTED_NUMERAL.format(raw=numeral.raw)
            found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail, index))
    for raw in suspect_counts(text, locale):
        detail = messages.SPELLED_COUNT.format(raw=raw)
        found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail, index))
    for name in unknown_capitalised(text, view.allowed_name_tokens):
        found.append(
            issue(IssueCode.UNKNOWN_ENTITY, messages.UNKNOWN_NAME.format(name=name), index)
        )
    for category in forbidden_categories(text):
        detail = messages.FORBIDDEN.format(category=category)
        found.append(issue(IssueCode.FORBIDDEN_CLAIM, detail, index))
    for category in unsafe_categories(text):
        detail = messages.UNSAFE.format(category=category)
        found.append(issue(IssueCode.FORBIDDEN_CLAIM, detail, index))
    return found


def check_lengths(headline: str, body: str, limits: TextLimits, index: int | None) -> list[Issue]:
    found: list[Issue] = []
    for field, text, limit in (
        ("headline", headline, limits.headline_max),
        ("body", body, limits.body_max),
    ):
        if len(text) > limit:
            detail = messages.TOO_LONG.format(field=field, length=len(text), limit=limit)
            found.append(issue(IssueCode.LENGTH_EXCEEDED, detail, index))
    sentences = [part for part in _SENTENCE_END.split(body.strip()) if part]
    if limits.max_sentences is not None and len(sentences) > limits.max_sentences:
        detail = messages.TOO_MANY_SENTENCES.format(
            count=len(sentences), limit=limits.max_sentences
        )
        found.append(issue(IssueCode.LENGTH_EXCEEDED, detail, index))
    return found


def check_analysis(analysis: AgentResult, view: FactView) -> list[Issue]:
    found: list[Issue] = []
    for index, claim in enumerate(analysis.claims):
        found += check_citations(claim.evidenceEventIds, claim.citedValues, view, index)
        supported = [value.value for value in claim.citedValues]
        found += check_text(claim.text, supported, Locale.en_GB, view, index)
    for limitation in analysis.limitations:
        found += check_text(limitation.root, [], Locale.en_GB, view, None)
    return found


def check_draft(draft: NarrativeDraft, view: FactView, index: int | None = None) -> list[Issue]:
    supported = [value.value for value in draft.citedValues]
    found = check_citations(draft.evidenceEventIds, draft.citedValues, view, index)
    found += check_text(f"{draft.headline}\n{draft.body}", supported, draft.locale, view, index)
    found += check_lengths(draft.headline, draft.body, PERSONA_LIMITS[draft.persona], index)
    if draft.locale is CANONICAL_LOCALE:
        cited = {value.metricRef: value.value for value in draft.citedValues}
        found += editorial_issues(draft.headline, draft.body, cited, draft.persona, view, index)
    if draft.breakdown is not None:
        locale = CANONICAL_LOCALE if draft.localeFallback else draft.locale
        found += check_breakdown(draft.breakdown, locale, view, index)
    return found


def check_breakdown(
    breakdown: AnalystBreakdown, locale: Locale, view: FactView, index: int | None = None
) -> list[Issue]:
    """Every grounding check per part, then the breakdown's editorial rules."""
    parts = breakdown_parts(breakdown)
    found: list[Issue] = []
    for name, part in parts:
        found += check_citations(part.evidenceEventIds, part.citedValues, view, index)
        supported = [value.value for value in part.citedValues]
        found += check_text(part.text, supported, locale, view, index)
        if len(part.text) > BREAKDOWN_PART_MAX:
            detail = messages.TOO_LONG.format(
                field=name, length=len(part.text), limit=BREAKDOWN_PART_MAX
            )
            found.append(issue(IssueCode.LENGTH_EXCEEDED, detail, index))
    return found + breakdown_editorial_issues(parts, locale, view, index)


def check_drafts(drafts: Sequence[NarrativeDraft], view: FactView) -> list[Issue]:
    return [
        found for index, draft in enumerate(drafts) for found in check_draft(draft, view, index)
    ]


def check_overlay(overlay: OverlayProposal, view: FactView) -> list[Issue]:
    refs = [ref.root for ref in overlay.metricRefs]
    found = check_citations(overlay.evidenceEventIds, [], view, None)
    found += [
        issue(IssueCode.UNSUPPORTED_NUMBER, messages.UNKNOWN_METRIC.format(metric_ref=ref))
        for ref in refs
        if ref not in view.metrics
    ]
    supported = [view.metrics[ref] for ref in refs if ref in view.metrics]
    found += check_text(f"{overlay.headline}\n{overlay.body}", supported, Locale.en_GB, view, None)
    found += check_lengths(overlay.headline, overlay.body, OVERLAY_LIMITS, None)
    cited = {ref: view.metrics[ref] for ref in refs if ref in view.metrics}
    found += editorial_issues(overlay.headline, overlay.body, cited, None, view)
    return found
