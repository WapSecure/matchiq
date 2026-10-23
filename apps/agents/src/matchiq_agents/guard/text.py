"""Pure text analysis used by the deterministic checks. No model calls."""

import re
from collections.abc import Iterable
from dataclasses import dataclass

from matchiq_agents.contracts.types import Locale
from matchiq_agents.guard.lexicon import (
    CAPITALISED_ALLOWED,
    COUNT_BEFORE_TIMES_REGEX,
    COUNT_QUANTIFIERS,
    FORBIDDEN_REGEX,
    NAME_TOKEN_REGEX,
    NUMBER_WORDS,
    NUMERAL_REGEX,
    SAFE_NAME_MAX_LENGTH,
    SAFE_NAME_MAX_TOKENS,
    SAFE_NAME_REGEX,
    SENTENCE_SPLIT_REGEX,
    WORD_REGEX,
)

FLOAT_TOLERANCE = 1e-9


@dataclass(frozen=True, slots=True)
class Numeral:
    raw: str
    value: float
    decimals: int

    def represents(self, value: float) -> bool:
        """True when `value`, rounded to this numeral's precision, is what the text shows."""
        return abs(self.value - round(abs(value), self.decimals)) < FLOAT_TOLERANCE


def _parse_numeral(raw: str) -> Numeral:
    normalised = raw.replace(",", ".")
    decimals = len(normalised.split(".")[1]) if "." in normalised else 0
    return Numeral(raw=raw, value=float(normalised), decimals=decimals)


def extract_numerals(text: str, locale: Locale) -> list[Numeral]:
    """Digits plus spelled-out numbers for the text's locale."""
    found = [_parse_numeral(match.group()) for match in NUMERAL_REGEX.finditer(text)]
    words = NUMBER_WORDS[locale]
    for match in WORD_REGEX.finditer(text):
        value = words.get(match.group().lower())
        if value is not None:
            found.append(Numeral(raw=match.group(), value=float(value), decimals=0))
    return found


def suspect_counts(text: str, locale: Locale) -> list[str]:
    """Words written as the count before "times" that are not digits, quantifiers or a number
    word the numeral check already reports."""
    words = NUMBER_WORDS[locale]
    return [
        word
        for word in COUNT_BEFORE_TIMES_REGEX.findall(text)
        if word.lower() not in COUNT_QUANTIFIERS and word.lower() not in words
    ]


def forbidden_categories(text: str) -> list[str]:
    return sorted({category for category, regex in FORBIDDEN_REGEX if regex.search(text)})


def name_tokens(name: str) -> list[str]:
    return NAME_TOKEN_REGEX.findall(name)


def is_safe_entity_name(name: str) -> bool:
    """Rejects names that could smuggle numbers or instructions into narrative text."""
    stripped = name.strip()
    return (
        0 < len(stripped) <= SAFE_NAME_MAX_LENGTH
        and len(name_tokens(stripped)) <= SAFE_NAME_MAX_TOKENS
        and SAFE_NAME_REGEX.fullmatch(stripped) is not None
        and not forbidden_categories(stripped)
    )


def unknown_capitalised(text: str, allowed_tokens: frozenset[str]) -> list[str]:
    """Capitalised tokens that are neither allowlisted names nor glossary terms.

    The first word of each sentence is exempt because capitalisation there carries no signal.
    """
    unknown: list[str] = []
    for sentence in SENTENCE_SPLIT_REGEX.split(text):
        words = WORD_REGEX.findall(sentence)
        unknown.extend(
            part
            for word in words[1:]
            for part in name_tokens(word)
            if part[0].isupper() and part not in allowed_tokens and part not in CAPITALISED_ALLOWED
        )
    return unknown


def restore_names(text: str, names: Iterable[str]) -> str:
    """Writes allowlisted names with their canonical capitals ('harbour city' → 'Harbour City').

    Small models often lower-case names. Only exact, case-insensitive matches of allowlisted
    names change, so no other word's casing (and no unknown-entity signal) is touched.
    """
    for name in sorted(names, key=len, reverse=True):
        pattern = re.compile(rf"(?<!\w){re.escape(name)}(?!\w)", re.IGNORECASE)
        text = pattern.sub(name, text)
    return text
