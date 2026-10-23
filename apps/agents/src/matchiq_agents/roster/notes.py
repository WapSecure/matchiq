"""Revision notes: each violation plus the concrete fix, fed back to the model on a retry.

Notes name the rule that failed and say what to write instead, because small models repair a
specific instruction far more reliably than a generic "fix the errors".
"""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import Issue
from matchiq_agents.pipeline.diagnostics import rule_of

NOTE: Final = "{detail}. {fix}"
FIXES: Final[dict[str, str]] = {
    "UNSUPPORTED_NUMERAL": (
        "Use only numbers from computedMetrics; for a time window write 'recently', never "
        "the minutes"
    ),
    "SPELLED_NUMBER": "Write numbers as digits",
    "WRONG_VALUE": "Copy each value exactly as computedMetrics gives it",
    "UNKNOWN_METRIC": "Cite only metricRef keys that appear in computedMetrics",
    "UNKNOWN_NAME": "Name only the teams and players listed in entities",
    "UNCITED": "Cite at least one id from eventIds",
    "UNKNOWN_EVENT": "Cite only ids from eventIds",
    "TOO_LONG": "Shorten it to fit the limit",
    "TOO_MANY_SENTENCES": "Merge or drop sentences to meet the limit",
    "MISSING_PERSONA": "Return a draft for this persona",
    "EVENT_NOT_LEAD": "Use `eventLine` as the headline",
    "OFF_TOPIC_HEADLINE": "Name the subject team and the moment's event in the headline",
    "SECONDARY_STAT": "Use `eventLine` as the headline; the only numbers are the score",
    "WRONG_DIRECTION": "The subject is rising: say they are on top or pushing, never falling",
    "MISSING_SCORELINE": "Give the score from goals.home and goals.away, as in 2\u20131",
    "GOAL_TALLY": "Give the score from goals.home and goals.away, never a count of goals",
    "MISSING_PLAYER": "Name the player from `subjectPlayer`",
    "RAW_INDEX": "Describe momentum in words ('are on top'); write no index number",
    "UNLABELLED_INDEX": "Write the value as 'a momentum index of' the number",
}


def revision_note(found: Issue) -> str:
    fix = FIXES.get(rule_of(found))
    return NOTE.format(detail=found.detail, fix=fix) if fix else found.detail


def revision_notes(issues: Sequence[Issue]) -> list[str]:
    return list(dict.fromkeys(revision_note(found) for found in issues))
