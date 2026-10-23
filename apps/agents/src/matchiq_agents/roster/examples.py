"""Few-shot examples for the prompts, built from the golden case `sample_high_regains`.

The case: `highRecoveries.home.rolling5m` = 5, `shots.home.rolling5m` = 3, events ev_00101,
ev_00112 and ev_00127, confidence medium. The team is renamed to Kestrel Vale, a name no fixture
uses: a model that copies the example's team into another insight then fails the allowlist check
instead of misattributing a statistic to a real team in the match. `tests/test_prompts.py` runs
every example through the deterministic checks against that case.
"""

import json
from typing import Final

EXAMPLE_TEAM: Final = "Kestrel Vale"
EXAMPLE_METRICS: Final = {"highRecoveries.home.rolling5m": 5, "shots.home.rolling5m": 3}
_REGAINS: Final = {"metricRef": "highRecoveries.home.rolling5m", "value": 5}
_SHOTS: Final = {"metricRef": "shots.home.rolling5m", "value": 3}

ANALYST_EXAMPLE: Final = {
    "claims": [
        {
            "claimType": "OBSERVATION",
            "text": "Kestrel Vale have won the ball back high up the pitch 5 times recently.",
            "evidenceEventIds": ["ev_00101", "ev_00112"],
            "citedValues": [_REGAINS],
        },
        {
            "claimType": "INFERENCE",
            "text": "Their press appears to be forcing turnovers.",
            "evidenceEventIds": ["ev_00101"],
            "citedValues": [],
        },
    ],
    "limitations": ["Synthetic match feed."],
    "confidenceLabel": "medium",
}

WRITER_EXAMPLE: Final = {
    "drafts": [
        {
            "persona": "CASUAL",
            "headline": "Kestrel Vale win the ball back high",
            "body": "Kestrel Vale have won the ball back high up the pitch 5 times recently.",
            "evidenceEventIds": ["ev_00101"],
            "citedValues": [_REGAINS],
        },
        {
            "persona": "ANALYST",
            "headline": "Kestrel Vale's press is producing high regains",
            "body": (
                "Kestrel Vale have 5 high recoveries in this spell, along with 3 shots. Their "
                "press appears to be forcing turnovers. Confidence is medium. This is a "
                "synthetic match feed."
            ),
            "evidenceEventIds": ["ev_00101", "ev_00112"],
            "citedValues": [_REGAINS, _SHOTS],
        },
        {
            "persona": "BROADCAST",
            "headline": "Kestrel Vale press high",
            "body": "5 high recoveries for Kestrel Vale recently.",
            "evidenceEventIds": ["ev_00101"],
            "citedValues": [_REGAINS],
        },
    ]
}

# The Localization example translates every Writer example draft into every target locale, so
# the model sees all three personas in every locale (ADR-0011 addendum 2, MQ-034).
LOCALIZATION_SOURCES: Final = [
    {key: draft[key] for key in ("persona", "headline", "body")}
    for draft in WRITER_EXAMPLE["drafts"]
]
LOCALIZATION_REQUIRED: Final = [
    {"locale": locale, "persona": draft["persona"]}
    for locale in ("fr-FR", "es-ES", "pcm-NG")
    for draft in LOCALIZATION_SOURCES
]
LOCALIZATION_EXAMPLE: Final = {
    "drafts": [
        {
            "locale": "fr-FR",
            "persona": "CASUAL",
            "headline": "Kestrel Vale récupère le ballon haut",
            "body": "Kestrel Vale a récupéré le ballon haut sur le terrain 5 fois récemment.",
        },
        {
            "locale": "fr-FR",
            "persona": "ANALYST",
            "headline": "Le pressing de Kestrel Vale provoque des récupérations hautes",
            "body": (
                "Kestrel Vale compte 5 récupérations hautes sur cette période, avec 3 tirs. Son "
                "pressing semble provoquer des pertes de balle. La confiance est moyenne. Ces "
                "données de match sont synthétiques."
            ),
        },
        {
            "locale": "fr-FR",
            "persona": "BROADCAST",
            "headline": "Kestrel Vale presse haut",
            "body": "5 récupérations hautes pour Kestrel Vale récemment.",
        },
        {
            "locale": "es-ES",
            "persona": "CASUAL",
            "headline": "Kestrel Vale recupera el balón arriba",
            "body": "Kestrel Vale ha recuperado el balón arriba 5 veces recientemente.",
        },
        {
            "locale": "es-ES",
            "persona": "ANALYST",
            "headline": "La presión de Kestrel Vale genera recuperaciones altas",
            "body": (
                "Kestrel Vale suma 5 recuperaciones altas en este tramo, junto con 3 tiros. Su "
                "presión parece estar forzando pérdidas de balón. La confianza es media. Estos "
                "datos de partido son sintéticos."
            ),
        },
        {
            "locale": "es-ES",
            "persona": "BROADCAST",
            "headline": "Kestrel Vale presiona arriba",
            "body": "5 recuperaciones altas para Kestrel Vale recientemente.",
        },
        {
            "locale": "pcm-NG",
            "persona": "CASUAL",
            "headline": "Kestrel Vale dey collect ball for top",
            "body": "Kestrel Vale don collect di ball back for top 5 times recently.",
        },
        {
            "locale": "pcm-NG",
            "persona": "ANALYST",
            "headline": "Kestrel Vale press dey win ball for top",
            "body": (
                "Kestrel Vale don get 5 high recoveries for dis spell, plus 3 shots. Dia press "
                "be like say e dey force turnovers. Confidence na medium. Dis na synthetic match "
                "feed."
            ),
        },
        {
            "locale": "pcm-NG",
            "persona": "BROADCAST",
            "headline": "Kestrel Vale dey press for top",
            "body": "5 high recoveries for Kestrel Vale recently.",
        },
    ]
}

PRODUCER_EXAMPLE: Final = {
    "headline": "Kestrel Vale press high",
    "body": "5 high recoveries for Kestrel Vale recently.",
    "metricRefs": ["highRecoveries.home.rolling5m"],
}


def compact(example: object) -> str:
    return json.dumps(example, ensure_ascii=False, separators=(",", ":"))
