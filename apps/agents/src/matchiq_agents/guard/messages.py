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
NUMERALS_CHANGED: Final = "localised text changed the numbers ({source} -> {target})"
NAME_DROPPED: Final = "localised text dropped the proper noun {name}"
CRITIQUE: Final = "reviewer: {detail}"
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
    "NUMERALS_CHANGED": NUMERALS_CHANGED,
    "NAME_DROPPED": NAME_DROPPED,
    "CRITIQUE": CRITIQUE,
}
