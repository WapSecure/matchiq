"""Analyst breakdown (MQ-068): deterministic parts per moment type and locale, their checks, and
where the result attaches them."""

import re

import pytest
from pydantic import SecretStr

from matchiq_agents.contracts.types import (
    AnalystBreakdown,
    IssueCode,
    Locale,
    NarrativeDraft,
    Persona,
)
from matchiq_agents.domain.facts import FactView, build_fact_view
from matchiq_agents.guard.checks import check_breakdown
from matchiq_agents.guard.editorial_breakdown import breakdown_parts
from matchiq_agents.guard.lexicon import NUMBER_WORDS, WORD_REGEX
from matchiq_agents.limits import BREAKDOWN_PART_MAX
from matchiq_agents.models.mock import MockModel
from matchiq_agents.pipeline import result as result_module
from matchiq_agents.settings import Settings
from matchiq_agents.templates.breakdown import analyst_breakdown, build_breakdown
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.support.builders import STAR, CaseSpec, build_request, moment_context
from tests.support.models import FailingModel, FakeClock
from tests.test_templates import KINDS, NAMES

DIGITS = re.compile(r"(?<![\w.,])-?\d+(?:[.,]\d+)?(?!\w)")
ALL_KINDS = {**KINDS, "PLAYER_MILESTONE": {"touches.player.match": 50, "passes.player.match": 42}}
SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))


def _view(kind: str, context: dict[str, object] | None = None, **changes: object) -> FactView:
    fields: dict[str, object] = {"player_id": STAR, **NAMES, **changes}
    spec = CaseSpec(kind=kind, metrics=ALL_KINDS[kind], context=context, **fields)  # pyright: ignore[reportArgumentType]
    return build_fact_view(build_request(spec))


def _rich(kind: str) -> FactView:
    regain = ("ev_00200", 9) if kind == "GOAL" else None
    context = moment_context(
        score=(3, 2), minute=88, phase="FINAL_15", regain=regain, previous_minute=71
    )
    return _view(kind, context)


def _numbers(text: str) -> list[float]:
    return [float(raw.replace(",", ".")) for raw in DIGITS.findall(text)]


@pytest.mark.parametrize("kind", sorted(ALL_KINDS))
@pytest.mark.parametrize("locale", list(Locale))
def test_every_moment_and_locale_gets_a_grounded_breakdown(kind: str, locale: Locale) -> None:
    view = _rich(kind)
    breakdown = analyst_breakdown(view, locale)
    assert breakdown is not None
    assert check_breakdown(breakdown, locale, view) == []
    citable = view.citable_metrics
    for name, part in breakdown_parts(breakdown):
        assert 0 < len(part.text) <= BREAKDOWN_PART_MAX, (name, part.text)
        cited = {value.metricRef: value.value for value in part.citedValues}
        assert all(citable[ref] == value for ref, value in cited.items())
        assert all(any(abs(n - abs(v)) < 1e-9 for v in cited.values()) for n in _numbers(part.text))
        words = {word.lower() for word in WORD_REGEX.findall(part.text)}
        assert not words & set(NUMBER_WORDS[locale]), part.text
        assert {e.root for e in part.evidenceEventIds} <= set(view.citable_event_ids)
    assert breakdown.whyItMatters.citedValues, "context should give why-it-matters numbers"
    assert not breakdown.whatToWatch.citedValues


@pytest.mark.parametrize("kind", sorted(ALL_KINDS))
def test_every_locale_cites_the_same_metrics(kind: str) -> None:
    view = _rich(kind)
    cited = {
        locale: [[v.metricRef for v in part.citedValues] for _, part in breakdown_parts(found)]
        for locale in Locale
        if (found := analyst_breakdown(view, locale)) is not None
    }
    assert len(cited) == len(Locale)
    assert all(refs == cited[Locale.en_GB] for refs in cited.values())


@pytest.mark.parametrize("kind", sorted(ALL_KINDS))
@pytest.mark.parametrize("locale", list(Locale))
def test_a_packet_without_context_still_gets_a_valid_breakdown(kind: str, locale: Locale) -> None:
    view = _view(kind)
    breakdown = analyst_breakdown(view, locale)
    assert breakdown is not None
    assert breakdown.whyItMatters.citedValues == []
    assert not DIGITS.search(breakdown.whyItMatters.text)
    refs = [v.metricRef for _, part in breakdown_parts(breakdown) for v in part.citedValues]
    assert not any(ref.startswith("context.") for ref in refs)


def test_goal_breakdown_reads_as_a_story() -> None:
    breakdown = build_breakdown(_rich("GOAL"), Locale.en_GB)
    assert breakdown.whatHappened.text.startswith(
        "Ola Mensah scores for Penbrook Town, and they lead 3–2. Penbrook Town had won the "
        "ball back 9 seconds before the goal."
    )
    assert {e.root for e in breakdown.whatHappened.evidenceEventIds} >= {"ev_00200"}
    assert breakdown.whyItMatters.text.startswith(
        "Penbrook Town lead by 1 in minute 88, in the closing stages. In the last 10 minutes "
        "Penbrook Town have 5 shots, against a match average of 1.8 for a spell that long; "
        "Marshstead Albion have 1."
    )
    assert breakdown.whatToWatch.text == "Watch whether Penbrook Town can protect the lead."


def test_decimals_use_the_locale_separator() -> None:
    text = build_breakdown(_rich("SHOT_BURST"), Locale.fr_FR).whyItMatters.text
    assert "1,8" in text
    assert "1.8" not in text


def test_a_falling_trend_is_never_told_for_a_rising_moment() -> None:
    view = _view("SHOT_BURST", moment_context(direction="FALLING"))
    breakdown = build_breakdown(view, Locale.en_GB)
    assert "eased" not in breakdown.whyItMatters.text
    assert check_breakdown(breakdown, Locale.en_GB, view) == []
    goal = build_breakdown(_view("GOAL", moment_context(direction="FALLING")), Locale.en_GB)
    assert "eased off spell by spell: 4, 2, then 1 shots" in goal.whyItMatters.text


def test_trailing_and_level_goals_point_to_the_right_question() -> None:
    level = _view("GOAL", moment_context(score=(2, 2)))
    trailing = _view("GOAL", moment_context(score=(1, 2)))
    assert "equaliser" in build_breakdown(level, Locale.en_GB).whatToWatch.text
    assert "level in minute 67" in build_breakdown(level, Locale.en_GB).whyItMatters.text
    assert "trail by 1" in build_breakdown(trailing, Locale.en_GB).whyItMatters.text


def test_a_moment_without_a_team_uses_the_generic_subject() -> None:
    view = _view("MOMENTUM_SHIFT", moment_context("away"), team_id=None, player_id=None)
    breakdown = analyst_breakdown(view, Locale.en_GB)
    assert breakdown is not None
    assert "Marshstead Albion have 1" not in breakdown.whyItMatters.text


def _edited(breakdown: AnalystBreakdown, part: str, **changes: object) -> AnalystBreakdown:
    edited = getattr(breakdown, part).model_copy(update=changes)
    return breakdown.model_copy(update={part: edited})


def _rules(found: list[object]) -> list[str]:
    return [getattr(item, "detail", "") for item in found]


def test_an_index_value_without_its_label_is_flagged() -> None:
    view = _rich("MOMENTUM_SHIFT")
    breakdown = build_breakdown(view, Locale.en_GB)
    ref = "momentum.home.rolling5m"
    cited = [v for v in breakdown.whatHappened.citedValues if v.metricRef == ref]
    bad = _edited(
        breakdown, "whatHappened", text="Penbrook Town read 0.44 in this spell.", citedValues=cited
    )
    details = _rules(check_breakdown(bad, Locale.en_GB, view))
    assert any("without saying it is the momentum index" in d for d in details), details


def test_a_metric_repeated_across_parts_is_flagged() -> None:
    view = _rich("SHOT_BURST")
    breakdown = build_breakdown(view, Locale.en_GB)
    minute = [v for v in breakdown.whyItMatters.citedValues if v.metricRef == "context.minute"]
    bad = _edited(
        breakdown,
        "whatToWatch",
        text="Watch whether Penbrook Town can keep this up after minute 88.",
        citedValues=minute,
    )
    details = _rules(check_breakdown(bad, Locale.en_GB, view))
    assert any("cites context.minute again in whatToWatch" in d for d in details), details


def test_a_prediction_in_what_to_watch_is_flagged() -> None:
    view = _rich("GOAL")
    breakdown = build_breakdown(view, Locale.en_GB)
    bad = _edited(breakdown, "whatToWatch", text="Penbrook Town will win this match.")
    found = check_breakdown(bad, Locale.en_GB, view)
    assert any(item.code is IssueCode.FORBIDDEN_CLAIM for item in found)
    assert any("as a prediction" in item.detail for item in found)
    soft = _edited(breakdown, "whatToWatch", text="Penbrook Town are going to hold on.")
    assert any("as a prediction" in d for d in _rules(check_breakdown(soft, Locale.en_GB, view)))


def test_a_rising_moment_told_as_a_fall_is_flagged() -> None:
    view = _rich("PRESSURE_SWING")
    breakdown = build_breakdown(view, Locale.en_GB)
    bad = _edited(breakdown, "whatToWatch", text="Watch whether Penbrook Town keep dropping off.")
    details = _rules(check_breakdown(bad, Locale.en_GB, view))
    assert any("are fading" in d for d in details), details


def test_an_unsupported_number_or_foreign_event_is_flagged() -> None:
    view = _rich("SHOT_BURST")
    breakdown = build_breakdown(view, Locale.en_GB)
    bad = _edited(breakdown, "whatToWatch", text="Watch whether Penbrook Town reach 9 shots.")
    assert any(i.code is IssueCode.UNSUPPORTED_NUMBER for i in check_breakdown(bad, Locale.en_GB, view))
    foreign = _edited(
        breakdown, "whatToWatch", evidenceEventIds=[{"root": "ev_99999"}]  # pyright: ignore[reportArgumentType]
    )
    found = check_breakdown(foreign.model_validate(foreign.model_dump()), Locale.en_GB, view)
    assert any(i.code is IssueCode.UNCITED_EVIDENCE for i in found)


def _analyst(drafts: list[NarrativeDraft]) -> list[NarrativeDraft]:
    return [d for d in drafts if d.persona is Persona.ANALYST]


@pytest.mark.parametrize("model", [MockModel(), FailingModel()], ids=["mock", "template"])
async def test_results_attach_breakdowns_to_analyst_drafts_only(model: object) -> None:
    spec = CaseSpec(kind="GOAL", metrics=ALL_KINDS["GOAL"], player_id=STAR, **NAMES)  # pyright: ignore[reportArgumentType]
    spec = CaseSpec(**{**spec.__dict__, "context": moment_context(regain=("ev_00200", 9))})
    request = build_request(spec)
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(request)  # pyright: ignore[reportArgumentType]
    assert all(d.breakdown is None for d in result.narratives if d.persona is not Persona.ANALYST)
    analyst = _analyst(result.narratives)
    assert len(analyst) == len(Locale)
    view = build_fact_view(request)
    for draft in analyst:
        assert draft.breakdown is not None
        locale = Locale.en_GB if draft.localeFallback else draft.locale
        assert draft.breakdown == analyst_breakdown(view, locale)


async def test_a_breakdown_that_fails_its_checks_is_left_out(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(result_module, "analyst_breakdown", lambda _view, _locale: None)
    result = await build_orchestrator(SETTINGS, FakeClock(), FailingModel()).run(build_request())
    assert _analyst(result.narratives)
    assert all(d.breakdown is None for d in result.narratives)
