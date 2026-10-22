"""Failure taxonomy for live evaluations (docs/ai/EVALUATION.md).

Collects the structured `output_rejected` records the pipeline logs (`pipeline/diagnostics.py`)
and tabulates them by stage, rule, persona and locale. Window-length quotes ("in the last 10
minutes") are split out of UNSUPPORTED_NUMERAL because they are the single largest cause.
"""

import logging
import re
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass

from matchiq_agents.contracts.types import PipelineResult
from matchiq_agents.pipeline.diagnostics import EVENT, LOGGER_NAME

WINDOW_LENGTH = "WINDOW_LENGTH"
RAW_IN_DETAIL = re.compile(r"^states (\S+) which")
WINDOW_AFTER = r"(?:\s+\w+)?\s*(?:-|\s)?(?:min\w*|')"
WINDOW_BEFORE = r"(?:last|past|previous|final|derni\w+|[úu]ltim\w+)\s+"


@dataclass(frozen=True, slots=True)
class Rejection:
    agent: str
    rule: str
    persona: str | None
    locale: str | None
    attempt: int | None
    detail: str
    snippet: str


def refine(rule: str, detail: str, snippet: str) -> str:
    """UNSUPPORTED_NUMERAL whose number is a time window becomes WINDOW_LENGTH."""
    match = RAW_IN_DETAIL.match(detail)
    if rule != "UNSUPPORTED_NUMERAL" or match is None:
        return rule
    raw = re.escape(match.group(1))
    window = re.compile(
        rf"(?<![\d.,]){raw}{WINDOW_AFTER}|{WINDOW_BEFORE}{raw}(?![\d.,])", re.IGNORECASE
    )
    return WINDOW_LENGTH if window.search(snippet) else rule


class RejectionCollector(logging.Handler):
    def __init__(self) -> None:
        super().__init__(logging.INFO)
        self.records: list[Rejection] = []

    def emit(self, record: logging.LogRecord) -> None:
        data = record.__dict__
        if data.get("event") != EVENT:
            return
        rule = refine(str(data["rule"]), str(data["detail"]), str(data["snippet"]))
        self.records.append(
            Rejection(
                agent=str(data["agent"]),
                rule=rule,
                persona=data.get("persona"),
                locale=data.get("locale"),
                attempt=data.get("attempt"),
                detail=str(data["detail"]),
                snippet=str(data["snippet"]),
            )
        )

    def drain(self) -> list[Rejection]:
        drained, self.records = self.records, []
        return drained

    def install(self) -> "RejectionCollector":
        target = logging.getLogger(LOGGER_NAME)
        target.setLevel(logging.INFO)
        target.addHandler(self)
        target.propagate = False
        return self


def _table(title: str, counts: Counter[str]) -> list[str]:
    if not counts:
        return [f"{title}: none"]
    width = max(len(key) for key in counts)
    rows = [f"  {key:<{width}} {count:>4}" for key, count in counts.most_common()]
    return [f"{title}:", *rows]


def counts(rejections: Iterable[Rejection]) -> dict[str, int]:
    return dict(Counter(f"{r.agent}/{r.rule}" for r in rejections).most_common())


def taxonomy(rejections: Iterable[Rejection]) -> str:
    listed = list(rejections)
    by_stage_rule = Counter(f"{r.agent}/{r.rule}" for r in listed)
    by_locale = Counter(f"{r.locale or 'en-GB'}/{r.rule}" for r in listed if r.persona)
    by_persona = Counter(f"{r.persona}/{r.rule}" for r in listed if r.persona)
    return "\n".join(
        [
            f"rejections total={len(listed)}",
            *_table("by stage/rule", by_stage_rule),
            *_table("by locale/rule (persona items)", by_locale),
            *_table("by persona/rule", by_persona),
        ]
    )


def narrative_share(results: Iterable[PipelineResult]) -> str:
    """AGENT vs TEMPLATE per persona and per locale; a locale fallback counts as its own kind."""
    by_persona: Counter[str] = Counter()
    by_locale: Counter[str] = Counter()
    total: Counter[str] = Counter()
    for result in results:
        for draft in result.narratives:
            kind = draft.source.value + ("+localeFallback" if draft.localeFallback else "")
            total[kind] += 1
            by_persona[f"{draft.persona.value}/{kind}"] += 1
            by_locale[f"{draft.locale.value}/{kind}"] += 1
    agent = total["AGENT"]
    count = sum(total.values()) or 1
    return "\n".join(
        [
            f"agent_share={agent}/{count} ({100 * agent / count:.0f}%) {dict(total)}",
            *_table("narratives by persona", by_persona),
            *_table("narratives by locale", by_locale),
        ]
    )
