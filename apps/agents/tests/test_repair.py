"""Deterministic repairs may only delete text or blur a window; metric values never change."""

import pytest

from matchiq_agents.contracts.types import Locale, Persona
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.guard.repair import (
    DROP_WINDOW,
    TRIM_SENTENCES,
    Repair,
    drop_windows,
    metric_windows,
    trim_sentences,
)
from matchiq_agents.guard.text import extract_numerals
from matchiq_agents.limits import PERSONA_LIMITS, TextLimits
from matchiq_agents.roster.repairs import overlay_refs, repair_draft
from matchiq_agents.roster.schemas import CitedValueOut, DraftOut
from tests.support.builders import CaseSpec, build_request

CASUAL = PERSONA_LIMITS[Persona.CASUAL]
WINDOWS = frozenset({5, 10})


def test_trim_keeps_whole_leading_sentences_within_the_sentence_limit() -> None:
    body, repair = trim_sentences("Harbour City press high. They have 5 regains.", CASUAL)
    assert body == "Harbour City press high."
    assert repair is not None
    assert repair.code == TRIM_SENTENCES
    assert "kept 1 of 2" in repair.detail


def test_trim_respects_the_character_limit() -> None:
    limits = TextLimits(headline_max=60, body_max=40)
    body, repair = trim_sentences("Short one here. Second sentence is long enough.", limits)
    assert body == "Short one here."
    assert repair is not None


@pytest.mark.parametrize("body", ["Harbour City press high.", ""])
def test_trim_leaves_text_that_fits_alone(body: str) -> None:
    assert trim_sentences(body, CASUAL) == (body, None)


def test_trim_never_cuts_inside_a_sentence() -> None:
    long_first = "x" * 250 + ". Short."
    assert trim_sentences(long_first, CASUAL) == (long_first, None)


def test_windows_come_from_metric_refs() -> None:
    refs = ["shots.home.rolling10m", "pressures.away.previous5m", "goals.home.match"]
    assert metric_windows(refs) == frozenset({10, 5})


@pytest.mark.parametrize(
    ("text", "locale", "expected"),
    [
        (
            "Harbour City have 5 high recoveries in the last 10 minutes.",
            Locale.en_GB,
            "Harbour City have 5 high recoveries recently.",
        ),
        (
            "Harbour City have 5 pressures recently and 14 in the rolling 10 minutes.",
            Locale.en_GB,
            "Harbour City have 5 pressures recently and 14 recently.",
        ),
        (
            "In the past 10 minutes, Harbour City have 5 regains.",
            Locale.en_GB,
            "Recently, Harbour City have 5 regains.",
        ),
        (
            "Harbour City won 5 regains in a 10-minute spell.",
            Locale.en_GB,
            "Harbour City won 5 regains recently.",
        ),
        (
            "Harbour City a 5 récupérations au cours des 10 dernières minutes.",
            Locale.fr_FR,
            "Harbour City a 5 récupérations récemment.",
        ),
        (
            "Harbour City suma 5 recuperaciones en los últimos 10 minutos.",
            Locale.es_ES,
            "Harbour City suma 5 recuperaciones recientemente.",
        ),
        (
            "Harbour City don collect ball 5 times for di last 10 minutes.",
            Locale.pcm_NG,
            "Harbour City don collect ball 5 times recently.",
        ),
    ],
)
def test_window_phrases_become_recently(text: str, locale: Locale, expected: str) -> None:
    repaired, repairs = drop_windows(text, locale, WINDOWS, [5])
    assert repaired == expected
    assert [repair.code for repair in repairs] == [DROP_WINDOW]


def test_window_repair_never_changes_a_metric_value() -> None:
    text = "Harbour City have 10 shots in the last 10 minutes."
    repaired, repairs = drop_windows(text, Locale.en_GB, WINDOWS, [10])
    assert (repaired, repairs) == (text, [])


def test_window_repair_needs_the_window_in_the_evidence() -> None:
    text = "Harbour City have 5 regains in the last 15 minutes."
    assert drop_windows(text, Locale.en_GB, WINDOWS, [5]) == (text, [])


def test_window_repair_keeps_every_metric_numeral() -> None:
    text = "Harbour City have 5 regains and 0.84 xG in the last 10 minutes."
    repaired, _ = drop_windows(text, Locale.en_GB, WINDOWS, [5, 0.84])
    before = [n.value for n in extract_numerals(text, Locale.en_GB) if n.value != 10]
    assert [n.value for n in extract_numerals(repaired, Locale.en_GB)] == before


def test_repair_draft_logs_window_and_trim() -> None:
    view = build_fact_view(build_request(CaseSpec(metrics={"highRecoveries.home.rolling10m": 5})))
    draft = DraftOut(
        persona="CASUAL",
        headline="Harbour City press high",
        body="Harbour City won 5 high recoveries in the last 10 minutes. They look sharp.",
        evidence_event_ids=["ev_00101"],
        cited_values=[CitedValueOut(metric_ref="highRecoveries.home.rolling10m", value=5)],
    )
    log: list[Repair] = []
    repaired = repair_draft(draft, view, log)
    assert repaired.body == "Harbour City won 5 high recoveries recently."
    assert [repair.code for repair in log] == [DROP_WINDOW, TRIM_SENTENCES]
    assert repaired.cited_values == draft.cited_values


def test_overlay_refs_adds_only_an_unambiguous_cited_ref() -> None:
    log: list[Repair] = []
    cited = {"highRecoveries.home.rolling5m": 5.0, "shots.home.rolling5m": 3.0}
    refs = overlay_refs("5 high recoveries for Harbour City", [], cited, log)
    assert refs == ["highRecoveries.home.rolling5m"]
    assert len(log) == 1
    ambiguous = {"a.home.match": 5.0, "b.home.match": 5.0}
    assert overlay_refs("5 of them", [], ambiguous, []) == []
