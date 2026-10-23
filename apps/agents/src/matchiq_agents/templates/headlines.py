"""Event headlines shared by the standard wording and the editorial repairs.

The repair that gives a goal draft the engine's goal line and the template use the same text,
so a repaired headline is exactly what the standard wording would have said.
"""

from matchiq_agents.contracts.types import InsightKind
from matchiq_agents.domain.story import Score
from matchiq_agents.templates.phrasebook import Phrasebook


def goal_line(book: Phrasebook, team: str, score: Score | None, limit: int) -> str:
    short = book.shorts[InsightKind.GOAL].format(subject=team)
    if score is None:
        options = [book.goal.headline_unscored.format(team=team), short]
    else:
        line = book.goal.headlines[score.state].format(team=team, s=score.subject, o=score.other)
        options = [line, f"{short} {score.subject}\u2013{score.other}", short]
    return next((option for option in options if len(option) <= limit), options[-1])


def red_card_line(book: Phrasebook, team: str, limit: int) -> str:
    line = book.leads[InsightKind.RED_CARD][0].format(subject=team)
    return line if len(line) <= limit else book.shorts[InsightKind.RED_CARD].format(subject=team)
