"""Structured rejection diagnostics: why model output did not reach air (docs/ai/EVALUATION.md).

Every rejected model output is logged once per issue with its stage, rule, persona and locale,
so evaluations and operators can build a failure taxonomy without parsing free text. Logging is
the only side effect; nothing here changes what the pipeline accepts.
"""

import logging
import re
from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import AgentName, Issue, Locale, Persona
from matchiq_agents.guard import messages

LOGGER_NAME: Final = "matchiq_agents.rejections"
EVENT: Final = "output_rejected"
SNIPPET_MAX: Final = 160
TIMEOUT: Final = "TIMEOUT"
TRANSPORT: Final = "TRANSPORT"
UNPARSEABLE: Final = "UNPARSEABLE"
CONTRACT_INVALID: Final = "CONTRACT_INVALID"
NO_CLAIMS: Final = "NO_CLAIMS"

logger = logging.getLogger(LOGGER_NAME)


class OutputRejectedError(ValueError):
    """Model output parsed but failed a check; the issues are already reported."""

    def __init__(self, detail: str, issues: Sequence[Issue] = ()) -> None:
        super().__init__(detail)
        self.issues = tuple(issues)


def _template_regex(template: str) -> re.Pattern[str]:
    parts = re.split(r"\{\w+\}", template)
    return re.compile("^" + "(.+?)".join(re.escape(part) for part in parts) + "$", re.DOTALL)


RULES: Final = tuple(
    (rule, _template_regex(template)) for rule, template in messages.RULE_TEMPLATES.items()
)


def rule_of(found: Issue) -> str:
    """The fine-grained rule behind an issue; the contract's `code` is coarser."""
    for rule, regex in RULES:
        if regex.match(found.detail):
            return rule
    return found.code.value


def _emit(
    run_id: str,
    agent: AgentName,
    rule: str,
    *,
    code: str | None = None,
    detail: str = "",
    persona: Persona | None = None,
    locale: Locale | None = None,
    attempt: int | None = None,
    text: str = "",
) -> None:
    logger.info(
        EVENT,
        extra={
            "event": EVENT,
            "runId": run_id,
            "agent": agent.value,
            "rule": rule,
            "code": code or rule,
            "detail": detail[: messages.DETAIL_MAX],
            "persona": persona.value if persona else None,
            "locale": locale.value if locale else None,
            "attempt": attempt,
            "snippet": text[:SNIPPET_MAX],
        },
    )


def report_failure(run_id: str, agent: AgentName, rule: str, detail: str = "") -> None:
    """A call-level failure with no `Issue`: timeout, transport fault, unparseable output."""
    _emit(run_id, agent, rule, detail=detail)


def report_item(
    run_id: str, agent: AgentName, persona: Persona, locale: Locale | None = None
) -> None:
    """One persona or locale item that broke the output contract (length caps, empty text)."""
    _emit(run_id, agent, CONTRACT_INVALID, persona=persona, locale=locale)


def report(
    run_id: str,
    agent: AgentName,
    issues: Sequence[Issue],
    *,
    persona: Persona | None = None,
    locale: Locale | None = None,
    attempt: int | None = None,
    text: str = "",
) -> None:
    for found in issues:
        _emit(
            run_id,
            agent,
            rule_of(found),
            code=found.code.value,
            detail=found.detail,
            persona=persona,
            locale=locale,
            attempt=attempt,
            text=text,
        )
