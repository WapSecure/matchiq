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

LOCALIZATION_SOURCE: Final = WRITER_EXAMPLE["drafts"][0]
LOCALIZATION_EXAMPLE: Final = {
    "drafts": [
        {
            "locale": "fr-FR",
            "persona": "CASUAL",
            "headline": "Kestrel Vale récupère le ballon haut",
            "body": "Kestrel Vale a récupéré le ballon haut sur le terrain 5 fois récemment.",
        },
        {
            "locale": "es-ES",
            "persona": "CASUAL",
            "headline": "Kestrel Vale recupera el balón arriba",
            "body": "Kestrel Vale ha recuperado el balón arriba 5 veces recientemente.",
        },
        {
            "locale": "pcm-NG",
            "persona": "CASUAL",
            "headline": "Kestrel Vale dey collect ball for top",
            "body": "Kestrel Vale don collect di ball back for top 5 times recently.",
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
