"""Editorial rules and repairs (ADR-0011 addendum 3), with the live session's bad copy.

Session `fx_comeback_42_s7` had 0 grounding violations, yet its goal moments were headlined
with secondary stats and its momentum moments printed raw index values. Each of those drafts
is a regression case here.
"""

import pytest

from matchiq_agents.contracts.types import IssueCode, Locale, NarrativeSource, Persona
from matchiq_agents.domain.facts import FactView, build_fact_view
from matchiq_agents.guard.checks import check_draft
from matchiq_agents.guard.editorial import editorial_issues, event_line
from matchiq_agents.guard.editorial_repair import EditorialCopy, repair_editorial
from matchiq_agents.guard.repair import Repair
from matchiq_agents.pipeline.diagnostics import rule_of
from matchiq_agents.roster.convert import make_draft
from matchiq_agents.roster.repairs import repair_draft
from matchiq_agents.roster.schemas import CitedValueOut, DraftOut
from tests.support.builders import AWAY, STAR, CaseSpec, build_request

HOME_NAME, AWAY_NAME, SCORER = "Penbrook Town", "Marshstead Albion", "Ola Mensah"
# The 89' goal packet: Penbrook Town (home) make it 3-2.
LATE_GOAL = {
    "goals.home": 3, "goals.away": 2, "shots.home.rolling5m": 1, "shots.away.rolling5m": 0,
    "shotsOnTarget.home.rolling5m": 1, "finalThirdEntries.home.rolling5m": 1,
    "momentum.home.rolling5m": -0.67, "momentum.away.rolling5m": -1.04,
    "pressures.home.rolling5m": 3, "pressures.home.previous5m": 1,
}  # fmt: skip
MOMENTUM = {
    "momentum.home.rolling5m": -0.19, "momentum.away.rolling5m": -1.21,
    "momentum.home.previous5m": -1.06, "momentum.away.previous5m": -0.23,
    "finalThirdEntries.home.rolling5m": 2, "shots.home.rolling5m": 1,
}  # fmt: skip


def _view(kind: str, metrics: dict[str, float], **changes: object) -> FactView:
    spec = CaseSpec(
        kind=kind, metrics=metrics, team_name=HOME_NAME, away_name=AWAY_NAME,
        player_name=SCORER, **changes,  # pyright: ignore[reportArgumentType]
    )  # fmt: skip
    return build_fact_view(build_request(spec))


GOAL_VIEW = _view("GOAL", LATE_GOAL, priority="P0", player_id=STAR)
EQUALISER_VIEW = _view(
    "GOAL", {"goals.home": 1, "goals.away": 1, "shots.away.rolling5m": 1}, team_id=AWAY
)
MOMENTUM_VIEW = _view("MOMENTUM_SHIFT", MOMENTUM)


def _rules(headline: str, body: str, view: FactView, persona: Persona | None, **cited: float):
    refs = {ref.replace("__", "."): value for ref, value in cited.items()}
    return {rule_of(found) for found in editorial_issues(headline, body, refs, persona, view)}


def _draft(persona: str, headline: str, body: str, cited: dict[str, float]) -> DraftOut:
    return DraftOut(
        persona=persona,  # pyright: ignore[reportArgumentType]
        headline=headline,
        body=body,
        evidence_event_ids=["ev_00101"],
        cited_values=[CitedValueOut(metric_ref=ref, value=value) for ref, value in cited.items()],
    )


def test_late_goal_headlined_with_final_third_is_rejected() -> None:
    rules = _rules(
        "Penbrook Town in final third", "2 goals for Penbrook Town recently.", GOAL_VIEW,
        Persona.BROADCAST, goals__away=2,
    )  # fmt: skip
    assert rules == {"EVENT_NOT_LEAD", "MISSING_SCORELINE", "GOAL_TALLY", "MISSING_PLAYER"}


def test_goal_headlined_with_equal_shots_is_rejected() -> None:
    rules = _rules(
        "Equal shots for both teams", "Both teams have taken 1 shot recently.", EQUALISER_VIEW,
        Persona.BROADCAST, shots__away__rolling5m=1,
    )  # fmt: skip
    assert {"EVENT_NOT_LEAD", "MISSING_SCORELINE"} <= rules


def test_goal_headlined_with_a_shot_on_target_is_rejected() -> None:
    rules = _rules(
        "Penbrook Town have a shot on target", "1 shot on target for Penbrook Town recently.",
        GOAL_VIEW, Persona.CASUAL, shotsOnTarget__home__rolling5m=1,
    )  # fmt: skip
    assert "EVENT_NOT_LEAD" in rules


def test_goal_that_leads_with_the_score_and_scorer_passes() -> None:
    headline = event_line(GOAL_VIEW)
    assert headline == "GOAL — Penbrook Town lead 3\u20132"
    body = "Ola Mensah scores for Penbrook Town, and they lead 3\u20132."
    assert _rules(headline, body, GOAL_VIEW, Persona.CASUAL, goals__home=3, goals__away=2) == set()


def test_goal_headline_with_a_secondary_number_is_rejected() -> None:
    rules = _rules(
        "Penbrook Town score after 1 shot", "Ola Mensah scores for Penbrook Town: 3-2.",
        GOAL_VIEW, Persona.BROADCAST, goals__home=3, goals__away=2, shots__home__rolling5m=1,
    )  # fmt: skip
    assert rules == {"SECONDARY_STAT"}


def test_equaliser_headline_and_score_in_home_away_order_pass() -> None:
    assert event_line(EQUALISER_VIEW) == "GOAL — Marshstead Albion equalise at 1\u20131"
    body = "Marshstead Albion score: Penbrook Town 1\u20131 Marshstead Albion."
    rules = _rules(
        "Marshstead Albion equalise", body, EQUALISER_VIEW, Persona.BROADCAST,
        goals__home=1, goals__away=1,
    )  # fmt: skip
    assert rules == set()


@pytest.mark.parametrize(
    ("headline", "body", "persona"),
    [
        ("Penbrook Town momentum down", "-0.19 in momentum for Penbrook Town recently.",
         Persona.BROADCAST),
        ("Penbrook Town lose momentum",
         "Penbrook Town are losing momentum, down to -0.19 recently.", Persona.CASUAL),
    ],
)  # fmt: skip
def test_momentum_told_as_a_raw_index_and_a_fall_is_rejected(
    headline: str, body: str, persona: Persona
) -> None:
    rules = _rules(headline, body, MOMENTUM_VIEW, persona, momentum__home__rolling5m=-0.19)
    assert rules == {"RAW_INDEX", "WRONG_DIRECTION"}


def test_momentum_headlined_with_final_third_is_off_topic() -> None:
    rules = _rules(
        "Penbrook Town in final third", "2 final-third entries for Penbrook Town recently.",
        MOMENTUM_VIEW, Persona.BROADCAST, finalThirdEntries__home__rolling5m=2,
    )  # fmt: skip
    assert rules == {"OFF_TOPIC_HEADLINE"}


def test_momentum_in_words_passes_for_fans() -> None:
    rules = _rules("Momentum swings to Penbrook Town", "Penbrook Town are on top.", MOMENTUM_VIEW,
                   Persona.BROADCAST)  # fmt: skip
    assert rules == set()


def test_analyst_may_show_a_labelled_index_but_not_a_bare_one() -> None:
    labelled = "Penbrook Town have a momentum index of -0.19 in this spell."
    bare = "Penbrook Town are on top. They sit at -0.19 in this spell."
    cited = {"momentum__home__rolling5m": -0.19}
    head = "Penbrook Town seize the momentum"
    assert _rules(head, labelled, MOMENTUM_VIEW, Persona.ANALYST, **cited) == set()
    assert _rules(head, bare, MOMENTUM_VIEW, Persona.ANALYST, **cited) == {"UNLABELLED_INDEX"}


def test_an_index_value_that_equals_a_cited_count_is_left_alone() -> None:
    view = _view("MOMENTUM_SHIFT", {"momentum.home.rolling5m": 2, "shots.home.rolling5m": 2})
    rules = _rules("Penbrook Town on top", "2 shots for Penbrook Town recently.", view,
                   Persona.BROADCAST, shots__home__rolling5m=2)  # fmt: skip
    assert rules == set()


def test_editorial_issues_are_revisable_schema_violations_on_canonical_drafts_only() -> None:
    draft = make_draft(
        _draft("BROADCAST", "Penbrook Town in final third", "Penbrook Town are on top.", {}),
        Locale.en_GB,
        NarrativeSource.AGENT,
    )
    assert {found.code for found in check_draft(draft, MOMENTUM_VIEW)} == {
        IssueCode.SCHEMA_VIOLATION
    }
    french = draft.model_copy(update={"locale": Locale.fr_FR})
    assert check_draft(french, MOMENTUM_VIEW) == []


def test_repair_gives_an_off_topic_goal_headline_the_event_line() -> None:
    log: list[Repair] = []
    draft = _draft(
        "BROADCAST", "Penbrook Town in final third", "Ola Mensah scores for Penbrook Town.",
        {"finalThirdEntries.home.rolling5m": 1},
    )  # fmt: skip
    repaired = repair_draft(draft, GOAL_VIEW, log)
    assert repaired.headline == "GOAL — Penbrook Town lead 3\u20132"
    assert {(v.metric_ref, v.value) for v in repaired.cited_values} >= {
        ("goals.home", 3), ("goals.away", 2)
    }  # fmt: skip
    assert [repair.code for repair in log] == ["LEAD_WITH_EVENT"]
    checked = make_draft(repaired, Locale.en_GB, NarrativeSource.AGENT)
    assert check_draft(checked, GOAL_VIEW) == []


def test_repair_never_rescues_a_goal_told_as_a_tally() -> None:
    log: list[Repair] = []
    draft = _draft("BROADCAST", "Penbrook Town in final third",
                   "2 goals for Penbrook Town recently.", {"goals.away": 2})  # fmt: skip
    checked = make_draft(repair_draft(draft, GOAL_VIEW, log), Locale.en_GB, NarrativeSource.AGENT)
    rules = {rule_of(found) for found in check_draft(checked, GOAL_VIEW)}
    assert "GOAL_TALLY" in rules


def test_repair_puts_the_scorer_first_only_where_the_persona_allows_it() -> None:
    copy = EditorialCopy("GOAL — Penbrook Town lead 3\u20132", "A late winner.", {})
    log: list[Repair] = []
    analyst = repair_editorial(copy, Persona.ANALYST, GOAL_VIEW, "ANALYST", log)
    assert analyst.body == "Ola Mensah scores for Penbrook Town. A late winner."
    assert [repair.code for repair in log] == ["ADD_PLAYER"]
    casual = repair_editorial(copy, Persona.CASUAL, GOAL_VIEW, "CASUAL", [])
    assert casual.body == "A late winner."


def test_repair_drops_an_index_sentence_when_another_remains() -> None:
    copy = EditorialCopy(
        "Momentum swings to Penbrook Town",
        "Penbrook Town are on top. They are at -0.19 recently.",
        {"momentum.home.rolling5m": -0.19},
    )
    log: list[Repair] = []
    repaired = repair_editorial(copy, Persona.BROADCAST, MOMENTUM_VIEW, "BROADCAST", log)
    assert repaired.body == "Penbrook Town are on top."
    assert [repair.code for repair in log] == ["DROP_INDEX_SENTENCE"]
    single = EditorialCopy(copy.headline, "-0.19 in momentum for Penbrook Town.", copy.cited)
    kept = repair_editorial(single, Persona.BROADCAST, MOMENTUM_VIEW, "BROADCAST", [])
    assert kept.body == single.body
