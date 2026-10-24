"""Deterministic Analyst breakdown (MQ-068): what happened, why it matters, what to watch.

Template-first by design: the model's output size stays as it is, so the breakdown never waits
on a model. Every number comes from the evidence or `context.*` metrics and is cited by its
part; each metric is stated once across the parts. Optional sentences are dropped, in every
locale alike, until each part fits its limit, so translations cite the same metrics.
"""

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Final

from pydantic import ValidationError

from matchiq_agents.contracts.types import (
    AnalystBreakdown,
    InsightKind,
    Locale,
    MomentContext,
    ScoreState,
    TrendDirection,
)
from matchiq_agents.domain import context as refs
from matchiq_agents.domain.facts import FactView
from matchiq_agents.domain.story import GoalState, other_side, score_of
from matchiq_agents.guard.checks import check_breakdown
from matchiq_agents.limits import BREAKDOWN_PART_MAX
from matchiq_agents.roster.convert import facts_payload
from matchiq_agents.roster.schemas import FactsPayload
from matchiq_agents.templates.breakdown_book import BreakdownBook
from matchiq_agents.templates.breakdown_en import EN_GB_BREAKDOWN
from matchiq_agents.templates.breakdown_es import ES_ES_BREAKDOWN
from matchiq_agents.templates.breakdown_fr import FR_FR_BREAKDOWN
from matchiq_agents.templates.breakdown_pcm import PCM_NG_BREAKDOWN
from matchiq_agents.templates.facts import story_facts
from matchiq_agents.templates.metric_labels import metric_label
from matchiq_agents.templates.render import (
    PHRASEBOOKS,
    capitalise,
    fact_sentence,
    format_number,
    index_sentence,
    lead_sentence,
    subject_of,
)

K = InsightKind
BOOKS: Final[dict[Locale, BreakdownBook]] = {
    Locale.en_GB: EN_GB_BREAKDOWN,
    Locale.fr_FR: FR_FR_BREAKDOWN,
    Locale.es_ES: ES_ES_BREAKDOWN,
    Locale.pcm_NG: PCM_NG_BREAKDOWN,
}
# The MQ-060 rules forbid telling a rising moment as a fall.
FALL_KINDS: Final = frozenset({K.GOAL, K.RED_CARD, K.PLAYER_MILESTONE})
MAX_EXTRAS: Final = 2
GOAL_STATES: Final = {
    GoalState.LEAD: ScoreState.LEADING,
    GoalState.LEVEL: ScoreState.LEVEL,
    GoalState.TRAIL: ScoreState.TRAILING,
}


@dataclass(frozen=True, slots=True)
class Line:
    text: str
    refs: tuple[str, ...] = ()
    # The sentence states a linked event, so the part also cites `context.eventIds`.
    linked: bool = False


@dataclass(frozen=True, slots=True)
class Inputs:
    view: FactView
    facts: FactsPayload
    metrics: Mapping[str, float]

    @property
    def context(self) -> MomentContext | None:
        return self.view.context

    def value(self, ref: str, locale: Locale) -> str:
        return format_number(self.metrics[ref], locale)

    def has(self, *wanted: str) -> bool:
        return all(ref in self.metrics for ref in wanted)

    def team(self, locale: Locale) -> str:
        return self.view.team_name or PHRASEBOOKS[locale].generic_subject


Builder = Callable[[Inputs, Locale], list[Line]]


def _what_happened(inputs: Inputs, locale: Locale) -> list[Line]:
    facts = inputs.facts
    story = story_facts(facts)
    lead = lead_sentence(facts, story, locale, caption=False)
    lines = [Line(lead.text, lead.refs)]
    if inputs.view.kind is K.GOAL and inputs.has(refs.REGAIN_SECONDS):
        seconds = inputs.value(refs.REGAIN_SECONDS, locale)
        text = BOOKS[locale].regain.format(subject=inputs.team(locale), seconds=seconds)
        lines.append(Line(capitalise(text), (refs.REGAIN_SECONDS,), linked=True))
    if story.index:
        index = index_sentence(facts, story.index, locale)
        lines.append(Line(index.text, index.refs))
    for fact in story.extras[:MAX_EXTRAS]:
        sentence = fact_sentence(fact, facts, locale, caption=False)
        lines.append(Line(sentence.text, sentence.refs))
    return lines


def _score_line(inputs: Inputs, context: MomentContext, locale: Locale) -> Line | None:
    book = BOOKS[locale]
    level = context.scoreState is ScoreState.LEVEL
    wanted = (refs.MINUTE,) if level else (refs.MARGIN, refs.MINUTE)
    if not inputs.has(*wanted):
        return None
    text = book.score[context.scoreState].format(
        subject=inputs.team(locale),
        margin=inputs.value(refs.MARGIN, locale) if not level else "",
        minute=inputs.value(refs.MINUTE, locale),
    )
    return Line(capitalise(f"{text}{book.phases[context.phase]}."), wanted)


def _compare_line(inputs: Inputs, context: MomentContext, locale: Locale) -> Line | None:
    if context.comparison is None:
        return None
    side = context.side.value
    mine, average = refs.recent(side), refs.average(side)
    wanted = (refs.WINDOW_MINUTES, mine, average)
    if not inputs.has(*wanted) or inputs.metrics[mine] == inputs.metrics[average] == 0:
        return None
    book, metric = BOOKS[locale], context.comparison.metric.value
    text = book.compare.format(
        window=inputs.value(refs.WINDOW_MINUTES, locale),
        subject=inputs.team(locale),
        recent=inputs.value(mine, locale),
        label=metric_label(metric, locale, inputs.metrics[mine]),
        average=inputs.value(average, locale),
    )
    theirs = refs.recent(other_side(side))
    opponent = inputs.view.opponent_name
    if opponent is not None and inputs.view.team_name and inputs.has(theirs):
        other = inputs.value(theirs, locale)
        text += book.compare_opponent.format(opponent=opponent, other=other)
        wanted = (*wanted, theirs)
    return Line(capitalise(f"{text}."), wanted)


def _trend_line(inputs: Inputs, context: MomentContext, locale: Locale) -> Line | None:
    trend = context.trend
    if trend is None or not inputs.has(*refs.SPELLS):
        return None
    direction = trend.direction
    rising = direction is TrendDirection.RISING
    if not rising and not (direction is TrendDirection.FALLING and inputs.view.kind in FALL_KINDS):
        return None
    a, b, c = (inputs.value(ref, locale) for ref in refs.SPELLS)
    label = metric_label(trend.metric.value, locale, inputs.metrics[refs.SPELLS[-1]])
    text = (
        BOOKS[locale]
        .trend[direction]
        .format(subject=inputs.team(locale), a=a, b=b, c=c, label=label)
    )
    return Line(capitalise(text), refs.SPELLS)


def _previous_line(inputs: Inputs, locale: Locale) -> Line | None:
    if not inputs.has(refs.PREVIOUS_MINUTE):
        return None
    text = (
        BOOKS[locale]
        .previous[inputs.view.kind]
        .format(subject=inputs.team(locale), minute=inputs.value(refs.PREVIOUS_MINUTE, locale))
    )
    return Line(capitalise(text), (refs.PREVIOUS_MINUTE,))


def _why_it_matters(inputs: Inputs, locale: Locale) -> list[Line]:
    context = inputs.context
    lines: list[Line | None] = []
    if context is not None:
        lines = [
            _score_line(inputs, context, locale),
            _compare_line(inputs, context, locale),
            _trend_line(inputs, context, locale),
            _previous_line(inputs, locale),
        ]
    found = [line for line in lines if line is not None]
    return found or [Line(BOOKS[locale].why_plain[inputs.view.kind])]


def _goal_state(inputs: Inputs) -> ScoreState | None:
    if inputs.context is not None:
        return inputs.context.scoreState
    found = score_of(inputs.view.metrics, inputs.view.subject_side)
    return GOAL_STATES[found.state] if found is not None else None


def _what_to_watch(inputs: Inputs, locale: Locale) -> list[Line]:
    book = BOOKS[locale]
    subject = subject_of(inputs.facts, PHRASEBOOKS[locale])
    template = book.watch[inputs.view.kind]
    if inputs.view.kind is K.GOAL:
        state = _goal_state(inputs)
        if state is not None and inputs.view.team_name:
            template = book.watch_goal[state]
    return [Line(capitalise(template.format(subject=subject)))]


PARTS: Final[tuple[tuple[str, Builder], ...]] = (
    ("whatHappened", _what_happened),
    ("whyItMatters", _why_it_matters),
    ("whatToWatch", _what_to_watch),
)


def _joined(lines: Sequence[Line]) -> str:
    return " ".join(line.text for line in lines)


def _fitting(by_locale: Mapping[Locale, list[Line]]) -> int:
    """How many leading sentences fit in every locale; the first is always kept."""
    total = min(len(lines) for lines in by_locale.values())
    for count in range(total, 0, -1):
        if all(len(_joined(lines[:count])) <= BREAKDOWN_PART_MAX for lines in by_locale.values()):
            return count
    return 1


def _part(inputs: Inputs, lines: Sequence[Line]) -> dict[str, object]:
    cited = list(dict.fromkeys(ref for line in lines for ref in line.refs))
    events = [*inputs.view.event_ids]
    if any(line.linked for line in lines):
        events = list(inputs.view.citable_event_ids)
    return {
        "text": _joined(lines),
        "citedValues": [{"metricRef": ref, "value": inputs.metrics[ref]} for ref in cited],
        "evidenceEventIds": events,
    }


def build_breakdown(view: FactView, locale: Locale) -> AnalystBreakdown:
    """The breakdown in `locale`; raises `ValidationError` when it cannot meet the contract."""
    facts = facts_payload(view)
    inputs = Inputs(view, facts, view.citable_metrics)
    payload: dict[str, object] = {}
    for name, builder in PARTS:
        by_locale = {each: builder(inputs, each) for each in BOOKS}
        payload[name] = _part(inputs, by_locale[locale][: _fitting(by_locale)])
    return AnalystBreakdown.model_validate(payload)


def analyst_breakdown(view: FactView, locale: Locale) -> AnalystBreakdown | None:
    """The checked breakdown, or None when it fails a check (the worker then supplies its own)."""
    try:
        breakdown = build_breakdown(view, locale)
    except ValidationError:
        return None
    return None if check_breakdown(breakdown, locale, view) else breakdown
