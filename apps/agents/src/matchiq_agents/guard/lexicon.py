"""Controlled vocabulary for the deterministic Fact Checker.

Patterns are case-insensitive and matched on word boundaries. They cover claims the evidence
envelope can never support (medical, betting, predictive, managerial intent) and instruction-like
text, prompt leakage, links or markup that signal prompt injection.
"""

import re
from importlib.resources import files
from typing import Final, Literal

from pydantic import BaseModel, ConfigDict, Field

from matchiq_agents.contracts.types import Locale

LEXICON_FILE: Final = "narrative_lexicon.json"


class _Lexicon(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[1] = Field(alias="schemaVersion")
    forbidden: dict[str, tuple[str, ...]]
    safety: dict[str, tuple[str, ...]]


# Generated from libs/narrative-guard by `pnpm codegen`; the worker publish gate compiles the same
# patterns, so the two guards cannot drift. Safety covers profanity, slurs and abuse aimed at
# players, teams or officials; hate speech and subtler toxicity are left to the pluggable
# `ContentSafetyScreen` (Azure AI Content Safety when it is configured).
_LEXICON: Final = _Lexicon.model_validate_json(
    files("matchiq_agents.contracts.generated").joinpath(LEXICON_FILE).read_text("utf-8")
)

FORBIDDEN_PATTERNS: Final = _LEXICON.forbidden
SAFETY_PATTERNS: Final = _LEXICON.safety

FORBIDDEN_REGEX: Final = tuple(
    (category, re.compile(rf"(?<!\w)(?:{pattern})(?!\w)", re.IGNORECASE))
    for category, patterns in FORBIDDEN_PATTERNS.items()
    for pattern in patterns
)

SAFETY_REGEX: Final = tuple(
    (category, re.compile(rf"(?<!\w)(?:{pattern})(?!\w)", re.IGNORECASE))
    for category, patterns in SAFETY_PATTERNS.items()
    for pattern in patterns
)

# "one"/"un"/"uno" are omitted: they double as articles and pronouns and would flag
# ordinary prose; so is Pidgin "wan", which also means "want". Ordinals ("second half") are
# omitted for the same reason. Pidgin uses English number words plus phonetic spellings; "fo"
# stays because templates and prompts spell "for" in full. "twice" and "thrice" are counts the
# engine cannot audit ("hit the target twice"); "once" is left out, as a conjunction.
_ENGLISH: Final[dict[str, int]] = {
    "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "dozen": 12, "twice": 2, "thrice": 3,
}  # fmt: skip
_PIDGIN_SPELLINGS: Final[dict[str, int]] = {
    "tu": 2, "tri": 3, "fo": 4, "faiv": 5, "siks": 6, "sevin": 7, "et": 8, "nain": 9,
}  # fmt: skip
# One Localization call writes every locale, so English and the distinctive Pidgin spellings
# are also checked in fr-FR and es-ES. "tu", "fo" and "et" are left out there: they are
# ordinary French and Spanish words.
_LEAKED: Final[dict[str, int]] = {
    **_ENGLISH,
    **{word: value for word, value in _PIDGIN_SPELLINGS.items() if word not in {"tu", "fo", "et"}},
}
NUMBER_WORDS: Final[dict[Locale, dict[str, int]]] = {
    Locale.en_GB: _ENGLISH,
    Locale.fr_FR: {
        **_LEAKED,
        "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8,
        "neuf": 9, "dix": 10, "onze": 11, "douze": 12, "treize": 13, "quatorze": 14,
        "quinze": 15, "seize": 16, "vingt": 20,
    },
    Locale.es_ES: {
        **_LEAKED,
        "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
        "nueve": 9, "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14,
        "quince": 15, "dieciséis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
        "veinte": 20,
    },
    Locale.pcm_NG: {**_ENGLISH, **_PIDGIN_SPELLINGS},
}  # fmt: skip

# A count before "times" must be digits. A short word there that is neither a quantifier nor a
# known number word is a misspelt number ("twi times") that the number-word list cannot audit.
COUNT_BEFORE_TIMES_REGEX: Final = re.compile(
    r"(?<![\w'\u2019-])([^\W\d_]{1,6})\s+times\b", re.IGNORECASE
)
COUNT_QUANTIFIERS: Final = frozenset({
    "all", "and", "at", "both", "by", "dem", "di", "dis", "dose", "few", "good", "hard", "how",
    "many", "more", "most", "of", "other", "plenty", "recent", "same", "some", "so", "the",
    "these", "those", "too", "wey",
})  # fmt: skip

# Capitalised words that are not entities: football terms and locale-specific forms.
CAPITALISED_ALLOWED: Final = frozenset({"VAR", "MatchIQ"})

NUMERAL_REGEX: Final = re.compile(r"(?<![\w.,])\d+(?:[.,]\d+)?(?![\w])")
WORD_REGEX: Final = re.compile(r"[^\W\d_][\w'\u2019-]*")
SENTENCE_SPLIT_REGEX: Final = re.compile(r"\n+|(?<=[.!?:;\u2026])\s+|\s+[\u2014\u2013]\s+")
SAFE_NAME_REGEX: Final = re.compile(r"^[^\W\d_]+(?:[ '\u2019.-]{1,2}[^\W\d_]+)*$")
SAFE_NAME_MAX_LENGTH: Final = 48
SAFE_NAME_MAX_TOKENS: Final = 5
NAME_TOKEN_REGEX: Final = re.compile(r"[^\W\d_]+")

# Time windows named in metric refs (`rolling10m`, `previous5m`); see `guard/repair.py`.
METRIC_WINDOW_REGEX: Final = re.compile(r"(?:rolling|previous)(\d+)m$")
_EN_WINDOWS: Final = (
    (r"\b(?:in|over|during|within|across)\s+(?:the\s+)?(?:last|past|previous|final|latest|rolling)\s+"
     r"(?P<n>\d+)\s*(?:minutes?|mins?)\b", "recently"),
    (r"\b(?:in|over|during|within)\s+(?P<n>\d+)\s*(?:minutes?|mins?)\b", "recently"),
    (r"\bin\s+(?:a|the|this)\s+(?P<n>\d+)[-\s]min(?:ute)?\s+(?:spell|window|period|burst)\b",
     "recently"),
    (r"\b(?:a|the|this)\s+(?P<n>\d+)[-\s]min(?:ute)?\s+(?:spell|window|period|burst)\b",
     "this spell"),
)  # fmt: skip
_WINDOWS: Final[dict[Locale, tuple[tuple[str, str], ...]]] = {
    Locale.en_GB: _EN_WINDOWS,
    Locale.fr_FR: (
        (r"\b(?:au\s+cours\s+des|lors\s+des|durant\s+les|pendant\s+les|dans\s+les|sur\s+les|ces)"
         r"\s+(?P<n>\d+)\s+(?:derni[eè]res\s+)?minutes(?:\s+derni[eè]res)?\b", "récemment"),
        (r"\ben\s+(?P<n>\d+)\s+minutes\b", "récemment"),
    ),
    Locale.es_ES: (
        (r"\b(?:en|durante)\s+los\s+(?:[úu]ltimos\s+)?(?P<n>\d+)\s+minutos(?:\s+[úu]ltimos)?\b",
         "recientemente"),
        (r"\ben\s+(?P<n>\d+)\s+minutos\b", "recientemente"),
    ),
    Locale.pcm_NG: (
        (r"\b(?:for|inside|in)\s+(?:di|the)\s+(?:last|past)\s+(?P<n>\d+)\s*(?:minutes?|mins?)\b",
         "recently"),
        (r"\b(?:inside|in)\s+(?P<n>\d+)\s*(?:minutes?|mins?)\b", "recently"),
        *_EN_WINDOWS,
    ),
}  # fmt: skip
WINDOW_PHRASES: Final = {
    locale: tuple((re.compile(pattern, re.IGNORECASE), word) for pattern, word in patterns)
    for locale, patterns in _WINDOWS.items()
}
