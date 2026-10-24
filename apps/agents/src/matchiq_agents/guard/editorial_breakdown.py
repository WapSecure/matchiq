"""Editorial rules for the Analyst breakdown (MQ-068), on top of the ANALYST draft rules.

- Each metricRef is cited at most once across the three parts, so no part restates another.
- An internal index value carries its label in the sentence that shows it.
- "What happened" tells the event as the draft rules require (score after a goal, the named
  scorer or dismissed player); no part tells a goal as a tally.
- A rising moment is never told as a fall, and no part states a forecast ("will win").

The metric rule applies in every locale; the wording rules read the canonical en-GB text.
"""

from collections.abc import Sequence

from matchiq_agents.contracts.types import (
    AnalystBreakdown,
    BreakdownPart,
    InsightKind,
    Issue,
    Locale,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.guard import messages
from matchiq_agents.guard.editorial import CODE, SENTENCES, event_issues, index_issues
from matchiq_agents.guard.editorial_lexicon import (
    BREAKDOWN_DECLINE,
    GOAL_TALLY,
    PREDICTION_WORDS,
    RISING_KINDS,
)

FIRST_PART = "whatHappened"
GENERIC_SUBJECT = "the subject"


def breakdown_parts(breakdown: AnalystBreakdown) -> list[tuple[str, BreakdownPart]]:
    return [
        ("whatHappened", breakdown.whatHappened),
        ("whyItMatters", breakdown.whyItMatters),
        ("whatToWatch", breakdown.whatToWatch),
    ]


def _issue(detail: str, index: int | None) -> Issue:
    text = detail[: messages.DETAIL_MAX]
    return (
        Issue(code=CODE, detail=text)
        if index is None
        else Issue(code=CODE, detail=text, claimIndex=index)
    )


def _repeated(parts: Sequence[tuple[str, BreakdownPart]], index: int | None) -> list[Issue]:
    seen: set[str] = set()
    found: list[Issue] = []
    for name, part in parts:
        for value in part.citedValues:
            if value.metricRef in seen:
                detail = messages.REPEATED_METRIC.format(metric_ref=value.metricRef, part=name)
                found.append(_issue(detail, index))
            seen.add(value.metricRef)
    return found


def _direction(name: str, text: str, view: FactView, index: int | None) -> list[Issue]:
    if view.kind not in RISING_KINDS:
        return []
    opponent = view.opponent_name
    subject = view.team_name or GENERIC_SUBJECT
    return [
        _issue(messages.BREAKDOWN_DIRECTION.format(part=name, subject=subject), index)
        for sentence in SENTENCES.split(text)
        if BREAKDOWN_DECLINE.search(sentence) and not (opponent and opponent in sentence)
    ]


def _wording(name: str, part: BreakdownPart, view: FactView, index: int | None) -> list[Issue]:
    cited = {value.metricRef: value.value for value in part.citedValues}
    found = index_issues(part.text, cited, Persona.ANALYST, view, index)
    found += [
        _issue(messages.PREDICTION.format(part=name, raw=match.group(0)), index)
        for match in PREDICTION_WORDS.finditer(part.text)
    ]
    found += _direction(name, part.text, view, index)
    if name == FIRST_PART:
        found += event_issues(part.text, view, index)
    elif view.kind is InsightKind.GOAL:
        found += [
            _issue(messages.GOAL_TALLY.format(raw=match.group(0)), index)
            for match in GOAL_TALLY.finditer(part.text)
        ]
    return found


def breakdown_editorial_issues(
    parts: Sequence[tuple[str, BreakdownPart]],
    locale: Locale,
    view: FactView,
    index: int | None = None,
) -> list[Issue]:
    found = _repeated(parts, index)
    if locale is CANONICAL_LOCALE:
        for name, part in parts:
            found += _wording(name, part, view, index)
    return found
