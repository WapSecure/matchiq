from typing import Final

UNCITED: Final = "no evidence event cited"
UNKNOWN_EVENT: Final = "cites event {event_id} outside the evidence envelope"
UNKNOWN_METRIC: Final = "cites metric {metric_ref} that the engine did not compute"
WRONG_VALUE: Final = "cites {metric_ref}={cited} but the engine computed {actual}"
UNSUPPORTED_NUMERAL: Final = "states {raw} which matches no cited metric value"
SPELLED_NUMBER: Final = "writes the number {raw} as a word; use digits"
UNKNOWN_NAME: Final = "mentions {name}, which is not an allowlisted team or player"
FORBIDDEN: Final = "contains a forbidden claim ({category})"
UNSAFE: Final = "contains language unfit for broadcast ({category})"
TOO_LONG: Final = "{field} is {length} characters; the limit is {limit}"
TOO_MANY_SENTENCES: Final = "body has {count} sentences; the limit is {limit}"
MISSING_PERSONA: Final = "no draft returned for persona {persona}"
MISSING_ITEM: Final = "no localised item returned for {locale} {persona}"
SPELLED_COUNT: Final = "writes '{raw} times'; write the count in digits"
NUMERALS_CHANGED: Final = "localised text changed the numbers ({source} -> {target})"
NAME_DROPPED: Final = "localised text dropped the proper noun {name}"
CRITIQUE: Final = "reviewer: {detail}"
EVENT_NOT_LEAD: Final = "headline '{headline}' does not lead with the {moment}"
OFF_TOPIC_HEADLINE: Final = "headline '{headline}' is not about the {moment} for {subject}"
SECONDARY_STAT: Final = "goal headline leads with {raw} instead of the score"
WRONG_DIRECTION: Final = (
    "headline '{headline}' says {subject} are fading; this moment is their rise"
)
MISSING_SCORELINE: Final = "goal text does not give the score {score}"
GOAL_TALLY: Final = "states '{raw}' as a goal count; give the score instead"
MISSING_PLAYER: Final = "text does not name {player}, whom the evidence names"
RAW_INDEX: Final = "{persona} text shows the {label} value {raw}; describe it in words"
UNLABELLED_INDEX: Final = "shows the value {raw} without saying it is the {label}"
DETAIL_MAX: Final = 300

# Fine-grained rule names for the failure taxonomy (`pipeline/diagnostics.py`).
RULE_TEMPLATES: Final = {
    "UNCITED": UNCITED,
    "UNKNOWN_EVENT": UNKNOWN_EVENT,
    "UNKNOWN_METRIC": UNKNOWN_METRIC,
    "WRONG_VALUE": WRONG_VALUE,
    "UNSUPPORTED_NUMERAL": UNSUPPORTED_NUMERAL,
    "SPELLED_NUMBER": SPELLED_NUMBER,
    "UNKNOWN_NAME": UNKNOWN_NAME,
    "FORBIDDEN": FORBIDDEN,
    "UNSAFE_CONTENT": UNSAFE,
    "TOO_LONG": TOO_LONG,
    "TOO_MANY_SENTENCES": TOO_MANY_SENTENCES,
    "MISSING_PERSONA": MISSING_PERSONA,
    "MISSING_ITEM": MISSING_ITEM,
    "SPELLED_COUNT": SPELLED_COUNT,
    "NUMERALS_CHANGED": NUMERALS_CHANGED,
    "NAME_DROPPED": NAME_DROPPED,
    "CRITIQUE": CRITIQUE,
    "EVENT_NOT_LEAD": EVENT_NOT_LEAD,
    "OFF_TOPIC_HEADLINE": OFF_TOPIC_HEADLINE,
    "SECONDARY_STAT": SECONDARY_STAT,
    "WRONG_DIRECTION": WRONG_DIRECTION,
    "MISSING_SCORELINE": MISSING_SCORELINE,
    "GOAL_TALLY": GOAL_TALLY,
    "MISSING_PLAYER": MISSING_PLAYER,
    "RAW_INDEX": RAW_INDEX,
    "UNLABELLED_INDEX": UNLABELLED_INDEX,
}
