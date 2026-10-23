"""Vocabulary for the editorial rules (`guard/editorial.py`). English only: the rules check the
canonical en-GB drafts and the overlay; translations keep their facts by the locale checks.
"""

import re
from typing import Final

from matchiq_agents.contracts.types import InsightKind

K = InsightKind
_I = re.IGNORECASE

# What a headline must say for each moment type: the event itself, in any common wording.
_KIND_WORDS: Final[dict[InsightKind, str]] = {
    K.GOAL: r"goal\w*|scores?|scored|scoring|equalis\w*|equaliz\w*|level\w*|leads?|ahead|"
    r"in front|pull\w* one back|net|winner|strikes?|struck",
    K.RED_CARD: r"red|sent off|sending off|dismiss\w*|down to|marching orders",
    K.SHOT_BURST: r"shots?|shoot\w*|fir\w*|efforts?|attempts?|chances?|attack\w*|"
    r"on target|strikes?|barrage|peppe\w*",
    K.HIGH_REGAINS: r"press\w*|pressure|regain\w*|recover\w*|ball back|win\w* (?:the )?ball|"
    r"wins? it|high|turnovers?|steal\w*",
    K.PRESSURE_SWING: r"press\w*|pressure|squeez\w*|intensity|control|on top|hunt\w*",
    K.MOMENTUM_SHIFT: r"momentum|on top|control|grip|swing\w*|ascendan\w*|in charge|"
    r"take over|takes over|dominat\w*|upper hand|driving seat|tide|surg\w*|front foot",
    K.PLAYER_MILESTONE: r"milestone|landmark|reach\w*|record",
}
KIND_WORDS: Final = {
    kind: re.compile(rf"(?<!\w)(?:{words})(?!\w)", _I) for kind, words in _KIND_WORDS.items()
}
EVENT_KINDS: Final = frozenset({K.GOAL, K.RED_CARD})
# Moments the engine raises only for a side that is rising (`swing-rules.ts`).
RISING_KINDS: Final = frozenset({K.SHOT_BURST, K.HIGH_REGAINS, K.PRESSURE_SWING, K.MOMENTUM_SHIFT})
DECLINE_WORDS: Final = re.compile(
    r"(?<!\w)(?:los(?:e|es|ing|t)|drop\w*|down|declin\w*|weaken\w*|fad\w*|slump\w*|wan(?:e|es|"
    r"ing)|fall\w*|fell|dips?|dipping|slip\w*|stall\w*)(?!\w)",
    _I,
)
# "2 goals for Penbrook Town": a tally instead of the score, and the wrong side's in the
# session that motivated this rule.
GOAL_TALLY: Final = re.compile(r"(?<![\w.,])\d+\s+goals?(?!\w)", _I)
SCORE_DASH: Final = r"\s*[-\u2013—]\s*"

MOMENT_NAMES: Final[dict[InsightKind, str]] = {
    K.GOAL: "goal",
    K.RED_CARD: "red card",
    K.SHOT_BURST: "burst of shots",
    K.HIGH_REGAINS: "high regains",
    K.PRESSURE_SWING: "pressure swing",
    K.MOMENTUM_SHIFT: "momentum shift",
    K.PLAYER_MILESTONE: "milestone",
}

# Internal indices (contract `InternalIndexMetric`): their plain label, and the words an
# Analyst sentence must use when it shows the value.
INDEX_LABELS: Final[dict[str, str]] = {
    "momentum": "momentum index",
    "xT": "expected threat",
    "pressureIndex": "pressure index",
}
INDEX_LABEL_WORDS: Final[dict[str, re.Pattern[str]]] = {
    "momentum": re.compile(r"momentum", _I),
    "xT": re.compile(r"(?<!\w)xT(?!\w)|threat", _I),
    "pressureIndex": re.compile(r"pressure", _I),
}
