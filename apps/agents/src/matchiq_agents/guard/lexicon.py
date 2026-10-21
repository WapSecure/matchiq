"""Controlled vocabulary for the deterministic Fact Checker.

Patterns are case-insensitive and matched on word boundaries. They cover claims the evidence
envelope can never support (medical, betting, predictive, managerial intent) and instruction-like
text that signals prompt injection.
"""

import re
from typing import Final

from matchiq_agents.contracts.types import Locale

FORBIDDEN_PATTERNS: Final[dict[str, tuple[str, ...]]] = {
    "medical": (
        r"injur\w*",
        r"fatigue\w*",
        r"tired",
        r"exhaust\w*",
        r"hamstring",
        r"bless(?:é|ée|és|ées|ure|ures)",
        r"lesi[oó]n\w*",
        r"cansad\w*",
        r"fatigu[ée]\w*",
        r"agotad\w*",
        r"don\s+wound",
        r"(?:don|dey)\s+tire",
        r"(?:leg|body|knee)\s+dey\s+pain",
    ),
    "betting": (
        r"bet(?:s|ting)?",
        r"odds",
        r"wager\w*",
        r"bookmaker\w*",
        r"pari(?:s)?\s+sportifs?",
        r"cotes?",
        r"apuestas?",
        r"cuotas?",
        r"stak(?:e|ing)\s+(?:money|am|una|your)",
        r"booking\s+codes?",
        r"sure\s+banker",
    ),
    "prediction": (
        r"win\s+probability",
        r"(?:is|are)\s+(?:certain|sure|guaranteed)\s+to\s+win",
        r"will\s+(?:win|lose)",
        r"probabilit[ée]\s+de\s+victoire",
        r"va\s+gagner",
        r"probabilidad\s+de\s+victoria",
        r"va\s+a\s+ganar",
        r"go\s+(?:win|lose)(?!\s+(?:di\s+|the\s+)?(?:ball|possession))",
        r"(?:don\s+)?sure\s+say\s+(?:dem|e|una)\s+go\s+win",
    ),
    "managerial_intent": (
        r"(?:manager|coach|boss)\s+(?:has\s+)?(?:changed|switched|ordered)\w*",
        r"tactical\s+(?:switch|change)\s+(?:by|from)\s+the\s+(?:manager|coach)",
        r"(?:entra[iî]neur|coach)\s+a\s+chang[ée]",
        r"(?:entrenador|t[ée]cnico)\s+(?:ha\s+)?cambi[oó]",
        r"(?:manager|coach|oga)\s+(?:don\s+)?(?:change|switch|order)\w*",
    ),
    "injection": (
        r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?",
        r"disregard\s+(?:all\s+)?(?:previous|prior|above)",
        r"system\s+prompt",
        r"you\s+are\s+now",
        r"new\s+instructions?",
        r"developer\s+mode",
        r"forget\s+(?:all\s+)?(?:di|the|una)\s+(?:previous\s+)?(?:instructions?|rules?)",
        r"(?:forget|ignore)\s+wetin\s+dem\s+(?:tell|talk\s+to)\s+you",
    ),
}

FORBIDDEN_REGEX: Final = tuple(
    (category, re.compile(rf"(?<!\w){pattern}(?!\w)", re.IGNORECASE))
    for category, patterns in FORBIDDEN_PATTERNS.items()
    for pattern in patterns
)

# "one"/"un"/"uno" are omitted: they double as articles and pronouns and would flag
# ordinary prose; so is Pidgin "wan", which also means "want". Ordinals ("second half") are
# omitted for the same reason. Pidgin uses English number words plus phonetic spellings; "fo"
# stays because templates and prompts spell "for" in full.
_ENGLISH: Final[dict[str, int]] = {
    "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "dozen": 12,
}  # fmt: skip
NUMBER_WORDS: Final[dict[Locale, dict[str, int]]] = {
    Locale.en_GB: _ENGLISH,
    Locale.fr_FR: {
        "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8,
        "neuf": 9, "dix": 10, "onze": 11, "douze": 12, "treize": 13, "quatorze": 14,
        "quinze": 15, "seize": 16, "vingt": 20,
    },
    Locale.es_ES: {
        "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
        "nueve": 9, "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14,
        "quince": 15, "dieciséis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
        "veinte": 20,
    },
    Locale.pcm_NG: {
        **_ENGLISH, "tu": 2, "tri": 3, "fo": 4, "faiv": 5, "siks": 6, "sevin": 7, "et": 8,
        "nain": 9,
    },
}  # fmt: skip

# Capitalised words that are not entities: football terms and locale-specific forms.
CAPITALISED_ALLOWED: Final = frozenset({"VAR", "MatchIQ"})

NUMERAL_REGEX: Final = re.compile(r"(?<![\w.,])\d+(?:[.,]\d+)?(?![\w])")
WORD_REGEX: Final = re.compile(r"[^\W\d_][\w'\u2019-]*")
SENTENCE_SPLIT_REGEX: Final = re.compile(r"\n+|(?<=[.!?:;\u2026])\s+|\s+[\u2014\u2013]\s+")
SAFE_NAME_REGEX: Final = re.compile(r"^[^\W\d_]+(?:[ '\u2019.-]{1,2}[^\W\d_]+)*$")
SAFE_NAME_MAX_LENGTH: Final = 48
SAFE_NAME_MAX_TOKENS: Final = 5
NAME_TOKEN_REGEX: Final = re.compile(r"[^\W\d_]+")
