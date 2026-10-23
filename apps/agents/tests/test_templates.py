"""Standard wording per moment type and persona, on the packet shape the worker really sends.

Replay `fx_comeback_42_s8` showed every fallback body as a metric dump ("Final third entries
(away) 1; final third entries (away) 1; ...") under a headline that was only the moment type.
"""

import re

import pytest

from matchiq_agents.contracts.types import Locale, Persona
from matchiq_agents.domain.facts import FactView, build_fact_view
from matchiq_agents.guard.checks import check_draft, check_overlay
from matchiq_agents.templates.fallback import TemplateFallback
from tests.support.builders import AWAY, STAR, CaseSpec, build_request

FAMILIES = ("shots", "shotsOnTarget", "pressures", "recoveries", "highRecoveries",
            "finalThirdEntries", "momentum")  # fmt: skip
VALUES = {"shots": 3, "shotsOnTarget": 2, "pressures": 6, "recoveries": 2, "highRecoveries": 4,
          "finalThirdEntries": 1, "momentum": 0.44}  # fmt: skip
REAL = {
    f"{family}.{side}.{window}": (VALUES[family] if window == "rolling5m" else 1)
    * (-1 if family == "momentum" and side == "away" else 1)
    for family in FAMILIES
    for side in ("home", "away")
    for window in ("rolling5m", "previous5m")
}
KINDS = {
    "GOAL": {**REAL, "goals.home": 3, "goals.away": 2},
    "RED_CARD": {**REAL, "redCards.home": 1},
    "SHOT_BURST": REAL,
    "HIGH_REGAINS": REAL,
    "PRESSURE_SWING": REAL,
    "MOMENTUM_SHIFT": REAL,
}
NAMES = {
    "team_name": "Penbrook Town",
    "away_name": "Marshstead Albion",
    "player_name": "Ola Mensah",
}
MOMENT_TYPE_ONLY = re.compile(r"^(Goal|Red card|Momentum shift|Pressure swing|Shots raining in)$")
METRIC_DUMP = re.compile(r"\((?:home|away)\)|\d; ")
DIGIT = re.compile(r"\d")


def _fallback(kind: str, **changes: object) -> tuple[TemplateFallback, FactView]:
    fields: dict[str, object] = {"player_id": STAR, **NAMES, **changes}
    spec = CaseSpec(kind=kind, metrics=KINDS[kind], **fields)  # pyright: ignore[reportArgumentType]
    view = build_fact_view(build_request(spec))
    return TemplateFallback(view), view


@pytest.mark.parametrize("kind", sorted(KINDS))
@pytest.mark.parametrize("persona", list(Persona))
def test_standard_wording_passes_every_check_and_reads_as_a_story(
    kind: str, persona: Persona
) -> None:
    fallback, view = _fallback(kind)
    draft = fallback.draft(persona, Locale.en_GB)
    assert check_draft(draft, view) == [], (draft.headline, draft.body)
    assert not MOMENT_TYPE_ONLY.match(draft.headline)
    assert "Penbrook Town" in draft.headline
    assert not METRIC_DUMP.search(draft.body), draft.body
    refs = [value.metricRef for value in draft.citedValues]
    assert len(refs) == len(set(refs))


@pytest.mark.parametrize("kind", sorted(KINDS))
def test_overlay_passes_and_every_locale_cites_the_same_metrics(kind: str) -> None:
    fallback, view = _fallback(kind)
    assert check_overlay(fallback.overlay(), view) == []
    for persona in Persona:
        cited = {locale: fallback.draft(persona, locale).citedValues for locale in Locale}
        assert all(values == cited[Locale.en_GB] for values in cited.values())


def test_goal_leads_with_side_score_and_scorer() -> None:
    fallback, _ = _fallback("GOAL")
    casual = fallback.draft(Persona.CASUAL, Locale.en_GB)
    broadcast = fallback.draft(Persona.BROADCAST, Locale.en_GB)
    assert casual.headline == "GOAL — Penbrook Town lead 3\u20132"
    assert casual.body == "Ola Mensah scores for Penbrook Town, and they lead 3\u20132."
    assert broadcast.body == (
        "Ola Mensah scores for Penbrook Town: Penbrook Town 3\u20132 Marshstead Albion."
    )


def test_away_goal_that_pulls_one_back_keeps_home_away_order_on_the_scoreboard() -> None:
    fallback, _ = _fallback("GOAL", team_id=AWAY, player_id=None)
    draft = fallback.draft(Persona.BROADCAST, Locale.en_GB)
    assert draft.headline == "GOAL — Marshstead Albion pull one back at 2\u20133"
    assert draft.body == "Marshstead Albion score: Penbrook Town 3\u20132 Marshstead Albion."


@pytest.mark.parametrize("persona", [Persona.CASUAL, Persona.BROADCAST])
@pytest.mark.parametrize("locale", list(Locale))
def test_momentum_for_fans_is_words_only(persona: Persona, locale: Locale) -> None:
    fallback, _ = _fallback("MOMENTUM_SHIFT")
    draft = fallback.draft(persona, locale)
    assert not DIGIT.search(f"{draft.headline} {draft.body}"), draft.body


def test_momentum_for_analysts_labels_the_index() -> None:
    fallback, _ = _fallback("MOMENTUM_SHIFT")
    body = fallback.draft(Persona.ANALYST, Locale.en_GB).body
    assert "Momentum index (a descriptive scale, not a forecast): Penbrook Town 0.44" in body
    assert "Marshstead Albion -0.44." in body


def test_pressure_swing_states_the_rise_once() -> None:
    fallback, _ = _fallback("PRESSURE_SWING")
    casual = fallback.draft(Persona.CASUAL, Locale.en_GB)
    assert (
        casual.body == "Penbrook Town have 6 pressures recently, up from 1 in the previous spell."
    )
    assert fallback.draft(Persona.BROADCAST, Locale.en_GB).body == (
        "6 pressures for Penbrook Town recently."
    )


def test_template_analysis_is_plain_claims_without_metric_labels() -> None:
    fallback, _ = _fallback("SHOT_BURST")
    texts = [claim.text for claim in fallback.analysis().claims]
    assert texts[0] == "Penbrook Town have 3 shots recently."
    assert not any(METRIC_DUMP.search(text) for text in texts)
