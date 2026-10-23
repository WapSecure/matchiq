"""Deterministic rendering from engine facts only; shared by the template fallback and the mock.

The wording follows the editorial rules (`guard/editorial.py`): a goal leads with the scoring
side and the score, a red card with the dismissal, every headline names the subject and the
event, and Fan and Broadcast wording never shows an internal index.
"""

from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import InsightKind, Locale
from matchiq_agents.domain.story import SIDES, Window, score_of, window_of
from matchiq_agents.roster.schemas import FactsPayload
from matchiq_agents.templates.facts import Fact, Owner, StoryFacts
from matchiq_agents.templates.metric_labels import metric_label, value_suffix
from matchiq_agents.templates.phrasebook import Phrasebook
from matchiq_agents.templates.phrases_en import EN_GB
from matchiq_agents.templates.phrases_es import ES_ES
from matchiq_agents.templates.phrases_fr import FR_FR
from matchiq_agents.templates.phrases_pcm import PCM_NG

PHRASEBOOKS: Final[dict[Locale, Phrasebook]] = {
    Locale.en_GB: EN_GB,
    Locale.fr_FR: FR_FR,
    Locale.es_ES: ES_ES,
    Locale.pcm_NG: PCM_NG,
}
MAX_DECIMALS: Final = 2
K = InsightKind


@dataclass(frozen=True, slots=True)
class RenderedText:
    headline: str
    body: str
    cited: tuple[tuple[str, float], ...]


@dataclass(frozen=True, slots=True)
class Sentence:
    text: str
    refs: tuple[str, ...] = ()


def format_number(value: float, locale: Locale) -> str:
    if float(value).is_integer():
        return str(int(value))
    text = f"{round(value, MAX_DECIMALS):.{MAX_DECIMALS}f}".rstrip("0").rstrip(".")
    return text.replace(".", PHRASEBOOKS[locale].decimal_separator)


def capitalise(text: str) -> str:
    return text[:1].upper() + text[1:]


def subject_of(facts: FactsPayload, book: Phrasebook) -> str:
    if facts.insight_kind is K.PLAYER_MILESTONE and facts.subject_player:
        return facts.subject_player
    return facts.subject_team or facts.subject_player or book.generic_subject


def _who(fact: Fact, facts: FactsPayload, book: Phrasebook) -> str:
    if fact.owner is Owner.PLAYER and facts.subject_player:
        return facts.subject_player
    if fact.owner is Owner.OTHER and facts.opponent_team:
        return facts.opponent_team
    return facts.subject_team or book.generic_subject


def _value(ref: str, facts: FactsPayload, locale: Locale) -> str:
    return format_number(facts.computed_metrics[ref], locale) + value_suffix(ref)


def fact_sentence(fact: Fact, facts: FactsPayload, locale: Locale, *, caption: bool) -> Sentence:
    book = PHRASEBOOKS[locale]
    value = facts.computed_metrics[fact.ref]
    fields = {
        "subject": _who(fact, facts, book),
        "value": _value(fact.ref, facts, locale),
        "label": metric_label(fact.ref, locale, value),
        "window": book.windows[window_of(fact.ref)],
    }
    if fact.before is not None and not caption:
        before = _value(fact.before, facts, locale)
        text = book.rise.format(before=before, previous=book.windows[Window.PREVIOUS], **fields)
        return Sentence(capitalise(text), fact.refs())
    template = book.caption if caption else book.fact
    if fact.owner is Owner.PLAYER and not caption:
        template = book.fact_player
    return Sentence(capitalise(template.format(**fields)), (fact.ref,))


def _goal(facts: FactsPayload, locale: Locale, *, caption: bool) -> Sentence:
    book, phrases = PHRASEBOOKS[locale], PHRASEBOOKS[locale].goal
    team = subject_of(facts, book)
    player = facts.subject_player
    clause = (phrases.scorer if player else phrases.scorer_unnamed).format(team=team, player=player)
    score = score_of(facts.computed_metrics, facts.subject_side)
    if score is None:
        if caption:
            return Sentence(book.plain[K.GOAL][1].format(subject=player or team))
        return Sentence(f"{clause}.")
    refs = (score.subject_ref, score.other_ref)
    if caption and facts.opponent_team:
        home_first = score.side == SIDES[0]
        home, away = (team, facts.opponent_team) if home_first else (facts.opponent_team, team)
        text = phrases.scoreboard.format(
            scorer=clause, home=home, away=away, h=score.home, a=score.away
        )
        return Sentence(text, refs)
    state = phrases.states[score.state].format(s=score.subject, o=score.other)
    return Sentence(f"{clause}{state}.", refs)


def _red_card(facts: FactsPayload, locale: Locale, *, caption: bool) -> Sentence:
    book = PHRASEBOOKS[locale]
    phrases = book.red_card
    team, player = subject_of(facts, book), facts.subject_player
    if caption:
        template = phrases.caption if player else phrases.caption_unnamed
    else:
        template = phrases.casual if player else phrases.casual_unnamed
    return Sentence(template.format(team=team, player=player))


def lead_sentence(
    facts: FactsPayload, story: StoryFacts, locale: Locale, *, caption: bool
) -> Sentence:
    """The one-line story: the event for goals and red cards, else the leading fact."""
    sentence = _story_sentence(facts, story, locale, caption=caption)
    return Sentence(capitalise(sentence.text), sentence.refs)


def _story_sentence(
    facts: FactsPayload, story: StoryFacts, locale: Locale, *, caption: bool
) -> Sentence:
    if facts.insight_kind is K.GOAL:
        return _goal(facts, locale, caption=caption)
    if facts.insight_kind is K.RED_CARD:
        return _red_card(facts, locale, caption=caption)
    if story.lead is not None:
        return fact_sentence(story.lead, facts, locale, caption=caption)
    book = PHRASEBOOKS[locale]
    plain = book.plain[facts.insight_kind][1 if caption else 0]
    return Sentence(plain.format(subject=subject_of(facts, book)))


def index_sentence(facts: FactsPayload, refs: tuple[str, ...], locale: Locale) -> Sentence:
    book = PHRASEBOOKS[locale]
    label = capitalise(metric_label(refs[0], locale))
    subject = facts.subject_team or book.generic_subject
    values = [format_number(facts.computed_metrics[ref], locale) for ref in refs]
    if len(refs) == 1:
        return Sentence(
            book.index_single.format(label=label, subject=subject, value=values[0]), refs
        )
    text = book.index_pair.format(
        label=label, subject=subject, value=values[0], other=facts.opponent_team, before=values[1]
    )
    return Sentence(text, refs)
