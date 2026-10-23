"""Standard wording per persona: a real headline per moment type and plain sentences.

CASUAL is the one-line story. BROADCAST is a caption of the same story. ANALYST adds the
supporting facts (each metric once, in words), the labelled index for momentum, the confidence
and the limitations. Every locale states the same metrics, so translations keep the numbers.
"""

from matchiq_agents.contracts.types import InsightKind, Locale, Persona
from matchiq_agents.domain.story import score_of
from matchiq_agents.limits import PERSONA_LIMITS
from matchiq_agents.roster.schemas import FactsPayload
from matchiq_agents.templates.facts import StoryFacts, story_facts
from matchiq_agents.templates.headlines import goal_line
from matchiq_agents.templates.render import (
    PHRASEBOOKS,
    RenderedText,
    Sentence,
    capitalise,
    fact_sentence,
    index_sentence,
    lead_sentence,
    subject_of,
)

K = InsightKind


def headline(facts: FactsPayload, persona: Persona, locale: Locale, variant: int) -> str:
    limit = PERSONA_LIMITS[persona].headline_max
    book = PHRASEBOOKS[locale]
    subject = subject_of(facts, book)
    if facts.insight_kind is K.GOAL:
        score = score_of(facts.computed_metrics, facts.subject_side)
        return capitalise(goal_line(book, subject, score, limit))
    options = book.leads[facts.insight_kind]
    offset = 1 if persona is Persona.ANALYST else 0
    lead = options[(variant + offset) % len(options)].format(subject=subject)
    short = book.shorts[facts.insight_kind].format(subject=subject)
    return capitalise(lead if len(lead) <= limit else short)


def _tail(facts: FactsPayload, locale: Locale) -> list[Sentence]:
    book = PHRASEBOOKS[locale]
    label = book.confidence_labels[facts.confidence_label]
    tail = [Sentence(book.confidence.format(label=label))]
    if facts.counter_evidence:
        tail.append(Sentence(book.counter_note))
    if facts.data_coverage < 1:
        tail.append(Sentence(book.partial_coverage))
    tail.append(Sentence(book.limitation))
    return tail


def analyst_sentences(
    facts: FactsPayload, story: StoryFacts, locale: Locale, extras: int
) -> list[Sentence]:
    body = [lead_sentence(facts, story, locale, caption=False)]
    body += [fact_sentence(f, facts, locale, caption=False) for f in story.extras[:extras]]
    if story.index:
        body.append(index_sentence(facts, story.index, locale))
    return body + _tail(facts, locale)


def _joined(sentences: list[Sentence]) -> str:
    return " ".join(sentence.text for sentence in sentences)


def analyst_extras(facts: FactsPayload, story: StoryFacts) -> int:
    """How many supporting facts fit in every locale, so translations cite the same metrics."""
    limit = PERSONA_LIMITS[Persona.ANALYST].body_max
    for count in range(len(story.extras), -1, -1):
        sizes = [
            len(_joined(analyst_sentences(facts, story, locale, count))) for locale in PHRASEBOOKS
        ]
        if max(sizes) <= limit:
            return count
    return 0


def body(facts: FactsPayload, persona: Persona, locale: Locale) -> list[Sentence]:
    story = story_facts(facts)
    if persona is Persona.ANALYST:
        return analyst_sentences(facts, story, locale, analyst_extras(facts, story))
    return [lead_sentence(facts, story, locale, caption=persona is Persona.BROADCAST)]


def render_text(
    facts: FactsPayload, persona: Persona, locale: Locale, variant: int = 0
) -> RenderedText:
    sentences = body(facts, persona, locale)
    refs = list(dict.fromkeys(ref for sentence in sentences for ref in sentence.refs))
    cited = tuple((ref, facts.computed_metrics[ref]) for ref in refs)
    return RenderedText(headline(facts, persona, locale, variant), _joined(sentences), cited)
