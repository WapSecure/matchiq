"""Editorial rules: a key moment's copy leads with the real story (ADR-0011 addendum 3).

Grounding proves every number is right; these rules prove the copy is about the moment. They
run on the canonical en-GB drafts and the overlay, after the deterministic repairs:

- Goals and red cards lead with the event: the headline names the event and the side, the text
  gives the score after a goal (from `goals.home` / `goals.away`) and names the scorer or the
  dismissed player when the evidence does. A goal is never told as a tally ("2 goals").
- Every headline names the moment's subject and its event, so a goal is never headlined with
  an unrelated metric ("Equal shots for both teams"). Rising moments are never told as a fall.
- Internal indices (contract `InternalIndexMetric`) are never shown as numbers to Fan or
  Broadcast; the Analyst may show one only with its label.

Violations are SCHEMA_VIOLATION issues: the copy has the wrong shape for its moment. They are
revisable, so the Writer gets one rewrite before the per-persona standard wording replaces it.
"""

import re
from collections.abc import Mapping
from typing import Final

from matchiq_agents.contracts.types import InsightKind, Issue, IssueCode, Locale, Persona
from matchiq_agents.domain.facts import FactView
from matchiq_agents.domain.story import Score, family_of, is_internal_index, score_of
from matchiq_agents.guard import messages
from matchiq_agents.guard.editorial_lexicon import (
    DECLINE_WORDS,
    EVENT_KINDS,
    GOAL_TALLY,
    INDEX_LABEL_WORDS,
    INDEX_LABELS,
    KIND_WORDS,
    MOMENT_NAMES,
    RISING_KINDS,
    SCORE_DASH,
)
from matchiq_agents.guard.text import extract_numerals
from matchiq_agents.limits import OVERLAY_LIMITS
from matchiq_agents.templates.headlines import goal_line, red_card_line
from matchiq_agents.templates.phrases_en import EN_GB

K = InsightKind
CODE: Final = IssueCode.SCHEMA_VIOLATION
OVERLAY: Final = "BROADCAST"
FAN_FACING: Final = frozenset({Persona.CASUAL, Persona.BROADCAST, None})
# Sentence ends only: a colon stays inside the sentence that labels an index value.
SENTENCES: Final = re.compile(r"\n+|(?<=[.!?\u2026])\s+")


def _issue(detail: str, index: int | None) -> Issue:
    text = detail[: messages.DETAIL_MAX]
    return (
        Issue(code=CODE, detail=text)
        if index is None
        else Issue(code=CODE, detail=text, claimIndex=index)
    )


def score(view: FactView) -> Score | None:
    return score_of(view.metrics, view.subject_side) if view.team_name else None


def key_refs(view: FactView) -> tuple[str, ...]:
    """Metrics a moment's headline must be able to state: the score after a goal."""
    found = score(view) if view.kind is K.GOAL else None
    return () if found is None else (found.subject_ref, found.other_ref)


def event_line(view: FactView, limit: int = OVERLAY_LIMITS.headline_max) -> str | None:
    """The engine's own en-GB headline for a goal or red card, or None for other moments."""
    if view.team_name is None or view.kind not in EVENT_KINDS:
        return None
    if view.kind is K.GOAL:
        return goal_line(EN_GB, view.team_name, score(view), limit)
    return red_card_line(EN_GB, view.team_name, limit)


def scoreline_in(text: str, found: Score) -> bool:
    pairs = {(found.subject, found.other), (found.home, found.away)}
    return any(
        re.search(rf"(?<![\w.,]){a}{SCORE_DASH}{b}(?!\w|[.,]\d)", text) is not None for a, b in pairs
    )


def subjects(view: FactView) -> tuple[str, ...]:
    if view.kind is K.PLAYER_MILESTONE and view.player_name:
        return (view.player_name,)
    return tuple(name for name in (view.team_name, view.player_name) if name)


def headline_issues(headline: str, view: FactView, index: int | None = None) -> list[Issue]:
    moment = MOMENT_NAMES[view.kind]
    names = subjects(view)
    found: list[Issue] = []
    on_event = KIND_WORDS[view.kind].search(headline) is not None
    if view.kind in EVENT_KINDS and not on_event:
        found.append(
            _issue(messages.EVENT_NOT_LEAD.format(headline=headline, moment=moment), index)
        )
    elif not on_event or (names and not any(name in headline for name in names)):
        subject = names[0] if names else "the subject"
        detail = messages.OFF_TOPIC_HEADLINE.format(
            headline=headline, moment=moment, subject=subject
        )
        found.append(_issue(detail, index))
    if view.kind is K.GOAL:
        found += _secondary_stats(headline, view, index)
    if view.kind in RISING_KINDS and view.team_name and DECLINE_WORDS.search(headline):
        opponent = view.opponent_name
        if view.team_name in headline and not (opponent and opponent in headline):
            detail = messages.WRONG_DIRECTION.format(headline=headline, subject=view.team_name)
            found.append(_issue(detail, index))
    return found


def _secondary_stats(headline: str, view: FactView, index: int | None) -> list[Issue]:
    found = score(view)
    allowed = () if found is None else (found.subject, found.other)
    return [
        _issue(messages.SECONDARY_STAT.format(raw=numeral.raw), index)
        for numeral in extract_numerals(headline, Locale.en_GB)
        if not any(numeral.represents(value) for value in allowed)
    ]


def event_issues(text: str, view: FactView, index: int | None = None) -> list[Issue]:
    found: list[Issue] = []
    if view.kind is K.GOAL:
        current = score(view)
        if current is not None and not scoreline_in(text, current):
            shown = f"{current.subject}\u2013{current.other}"
            found.append(_issue(messages.MISSING_SCORELINE.format(score=shown), index))
        found += [
            _issue(messages.GOAL_TALLY.format(raw=match.group(0)), index)
            for match in GOAL_TALLY.finditer(text)
        ]
    if view.kind in EVENT_KINDS and view.player_name and view.player_name not in text:
        found.append(_issue(messages.MISSING_PLAYER.format(player=view.player_name), index))
    return found


def index_numerals(text: str, cited: Mapping[str, float], view: FactView) -> list[tuple[str, str]]:
    """(raw numeral, index family) for each number in `text` that shows an internal index.

    A numeral that also equals a cited display number is left alone: the guard cannot tell which
    one it states.
    """
    indices = {ref: value for ref, value in view.metrics.items() if is_internal_index(ref)}
    display = [value for ref, value in cited.items() if not is_internal_index(ref)]
    shown: list[tuple[str, str]] = []
    for numeral in extract_numerals(text, Locale.en_GB):
        if not numeral.raw[0].isdigit() or any(numeral.represents(v) for v in display):
            continue
        match = next((ref for ref, value in indices.items() if numeral.represents(value)), None)
        if match is not None:
            shown.append((numeral.raw, family_of(match)))
    return shown


def index_issues(
    text: str,
    cited: Mapping[str, float],
    persona: Persona | None,
    view: FactView,
    index: int | None,
) -> list[Issue]:
    found: list[Issue] = []
    if persona in FAN_FACING:
        name = persona.value if persona is not None else OVERLAY
        for raw, family in index_numerals(text, cited, view):
            detail = messages.RAW_INDEX.format(persona=name, label=INDEX_LABELS[family], raw=raw)
            found.append(_issue(detail, index))
        return found
    for sentence in SENTENCES.split(text):
        for raw, family in index_numerals(sentence, cited, view):
            if INDEX_LABEL_WORDS[family].search(sentence) is None:
                detail = messages.UNLABELLED_INDEX.format(raw=raw, label=INDEX_LABELS[family])
                found.append(_issue(detail, index))
    return found


def editorial_issues(
    headline: str,
    body: str,
    cited: Mapping[str, float],
    persona: Persona | None,
    view: FactView,
    index: int | None = None,
) -> list[Issue]:
    """Every editorial violation of one en-GB draft (`persona`) or the overlay (`None`)."""
    text = f"{headline}\n{body}"
    found = headline_issues(headline, view, index)
    found += event_issues(text, view, index)
    found += index_issues(text, cited, persona, view, index)
    return found
