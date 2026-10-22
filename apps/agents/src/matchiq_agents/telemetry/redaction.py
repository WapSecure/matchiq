from typing import cast

from matchiq_agents.telemetry.constants import (
    REDACTED,
    REDACTED_KEY_PATTERN,
    REDACTED_TEXT_PATTERNS,
    REDACTION_MAX_DEPTH,
)


def scrub_text(text: str) -> str:
    """Replaces credential shapes (bearer tokens, URL userinfo, key=value secrets) in text."""
    for pattern, replacement in REDACTED_TEXT_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def redact(value: object, depth: int = 0) -> object:
    """A copy safe to log: secret-named keys masked, strings scrubbed, nesting bounded."""
    if isinstance(value, str):
        return scrub_text(value)
    if not isinstance(value, dict | list | tuple):
        return value
    if depth >= REDACTION_MAX_DEPTH:
        return REDACTED
    if isinstance(value, dict):
        items = cast(dict[object, object], value).items()
        return {
            str(k): REDACTED if REDACTED_KEY_PATTERN.search(str(k)) else redact(v, depth + 1)
            for k, v in items
        }
    return [redact(v, depth + 1) for v in cast(list[object], value)]
