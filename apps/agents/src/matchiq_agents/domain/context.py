"""The `context.*` metric refs of a key moment (MQ-068), mirroring `CONTEXT_REFS` in
`libs/contracts/src/lib/moment-context.ts`. The engine computes every value; agents cite them."""

from typing import Final

PREFIX: Final = "context."
SCORE_HOME: Final = "context.score.home"
SCORE_AWAY: Final = "context.score.away"
MARGIN: Final = "context.score.margin"
MINUTE: Final = "context.minute"
WINDOW_MINUTES: Final = "context.compare.windowMinutes"
SPELLS: Final = ("context.trend.spell1", "context.trend.spell2", "context.trend.spell3")
REGAIN_SECONDS: Final = "context.linked.regainSeconds"
PREVIOUS_MINUTE: Final = "context.linked.previousMinute"


def recent(side: str) -> str:
    return f"context.compare.recent.{side}"


def average(side: str) -> str:
    return f"context.compare.average.{side}"


def is_context_ref(metric_ref: str) -> bool:
    return metric_ref.startswith(PREFIX)
