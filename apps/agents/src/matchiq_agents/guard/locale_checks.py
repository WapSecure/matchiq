"""Spec §27: statistics and proper nouns must survive translation unchanged."""

from matchiq_agents.contracts.types import Issue, IssueCode, NarrativeDraft
from matchiq_agents.domain.facts import FactView
from matchiq_agents.guard import messages
from matchiq_agents.guard.checks import check_draft, issue
from matchiq_agents.guard.text import extract_numerals


def _numbers(draft: NarrativeDraft) -> list[float]:
    return sorted(
        n.value for n in extract_numerals(f"{draft.headline}\n{draft.body}", draft.locale)
    )


def check_localised(source: NarrativeDraft, target: NarrativeDraft, view: FactView) -> list[Issue]:
    found = check_draft(target, view)
    source_numbers, target_numbers = _numbers(source), _numbers(target)
    if source_numbers != target_numbers:
        detail = messages.NUMERALS_CHANGED.format(source=source_numbers, target=target_numbers)
        found.append(issue(IssueCode.UNSUPPORTED_NUMBER, detail))
    source_text = f"{source.headline}\n{source.body}"
    target_text = f"{target.headline}\n{target.body}"
    for name in sorted(view.entity_names):
        if name in source_text and name not in target_text:
            found.append(issue(IssueCode.UNKNOWN_ENTITY, messages.NAME_DROPPED.format(name=name)))
    return found
