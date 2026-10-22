"""Deterministic, meaning-preserving repairs of model prose (ADR-0011 addendum 2).

Each repair only deletes text or replaces a time-window phrase with a vaguer word, so it can
never add a claim, a number or a name. Numbers that are metric values are never touched. Every
repair is recorded on the run's trace, and the deterministic checks run on the repaired text.

- `trim_sentences`: keeps the longest run of whole leading sentences that fits a persona's
  sentence and character limits. Dropping a trailing sentence removes a claim; it changes none.
- `drop_windows`: removes a window phrase ("in the last 10 minutes") when its number is the
  window of an engine metric (`rolling10m`, `previous5m`) and is not a cited value. The engine
  computed the metric over that window, so "recently" restates it without the number.
"""

import re
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import Locale
from matchiq_agents.guard.lexicon import METRIC_WINDOW_REGEX, WINDOW_PHRASES
from matchiq_agents.guard.text import FLOAT_TOLERANCE
from matchiq_agents.limits import TextLimits

SENTENCE_END: Final = re.compile(r"(?<=[.!?…])\s+")
TRIM_SENTENCES: Final = "TRIM_SENTENCES"
DROP_WINDOW: Final = "DROP_WINDOW"
TRIM_DETAIL: Final = "{field}: kept {kept} of {total} sentences"
WINDOW_DETAIL: Final = "{field}: removed window phrase '{phrase}'"


@dataclass(frozen=True, slots=True)
class Repair:
    code: str
    detail: str


def sentences(text: str) -> list[str]:
    return [part for part in SENTENCE_END.split(text.strip()) if part]


def trim_sentences(body: str, limits: TextLimits, field: str = "body") -> tuple[str, Repair | None]:
    parts = sentences(body)
    cap = limits.max_sentences if limits.max_sentences is not None else len(parts)
    fits = len(parts) <= cap and len(body) <= limits.body_max
    if fits or not parts:
        return body, None
    kept: list[str] = []
    for part in parts[:cap]:
        candidate = " ".join([*kept, part])
        if len(candidate) > limits.body_max:
            break
        kept.append(part)
    if not kept:
        return body, None
    detail = TRIM_DETAIL.format(field=field, kept=len(kept), total=len(parts))
    return " ".join(kept), Repair(TRIM_SENTENCES, detail)


def metric_windows(metric_refs: Iterable[str]) -> frozenset[int]:
    """Window lengths in minutes named by metric refs: `shots.home.rolling10m` → 10."""
    return frozenset(
        int(match.group(1))
        for ref in metric_refs
        for match in [METRIC_WINDOW_REGEX.search(ref)]
        if match is not None
    )


def _is_value(raw: str, values: Iterable[float]) -> bool:
    return any(abs(float(raw) - value) < FLOAT_TOLERANCE for value in values)


def _capitalise_if_first(text: str, start: int, replacement: str) -> str:
    before = text[:start].rstrip()
    at_start = not before or before[-1] in ".!?\n"
    return replacement[:1].upper() + replacement[1:] if at_start else replacement


def _tidy_spacing(text: str) -> str:
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    text = re.sub(r",\s*([.!?])", r"\1", text)
    return " ".join(text.split())


def drop_windows(
    text: str,
    locale: Locale,
    windows: frozenset[int],
    values: Iterable[float],
    field: str = "body",
) -> tuple[str, list[Repair]]:
    cited = list(values)
    repairs: list[Repair] = []
    for pattern, replacement in WINDOW_PHRASES[locale]:
        for match in list(pattern.finditer(text)):
            raw = match.group("n")
            if int(raw) not in windows or _is_value(raw, cited):
                continue
            phrase = match.group(0)
            start = text.find(phrase)
            if start < 0:
                continue
            word = _capitalise_if_first(text, start, replacement)
            text = f"{text[:start]}{word}{text[start + len(phrase) :]}"
            repairs.append(Repair(DROP_WINDOW, WINDOW_DETAIL.format(field=field, phrase=phrase)))
    return (_tidy_spacing(text) if repairs else text), repairs
