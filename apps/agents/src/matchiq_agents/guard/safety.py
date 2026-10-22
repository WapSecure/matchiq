"""Content safety for broadcast copy (spec §46 content filter, AI_AGENT_GOVERNANCE.md).

Two layers:

1. A deterministic blocklist (`unsafe_categories`), run inside every text check, so it covers
   agent drafts, localised items, overlays and templates alike. A hit is a FORBIDDEN_CLAIM and is
   never revised: the persona falls back to its template.
2. An optional `ContentSafetyScreen` port for a hosted classifier such as Azure AI Content
   Safety. None is wired today (no Azure subscription, ADR-0003); the Fact Checker calls a
   configured screen after the deterministic checks pass, and its findings can only add issues.
"""

from collections.abc import Sequence
from typing import Protocol

from matchiq_agents.contracts.types import Locale
from matchiq_agents.guard.lexicon import SAFETY_REGEX


def unsafe_categories(text: str) -> list[str]:
    return sorted({category for category, regex in SAFETY_REGEX if regex.search(text)})


class ContentSafetyScreen(Protocol):
    """Returns the unsafe categories found in each text, in order; empty lists mean safe."""

    async def screen(self, texts: Sequence[str], locale: Locale) -> list[list[str]]: ...
