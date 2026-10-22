"""Checks or records the prompt registry (docs/ai/EVALUATION.md, prompt versioning).

Usage (from apps/agents):
    uv run python scripts/prompt_registry.py            # exit 1 if a prompt is unrecorded
    uv run python scripts/prompt_registry.py --record   # append the current prompts

Recording refuses to change the text behind an existing version: bump the prompt's version.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from matchiq_agents.roster import registry
from matchiq_agents.roster.prompts import PROMPTS


def main(*, record: bool) -> int:
    prompts = list(PROMPTS.values())
    if record:
        try:
            registry.dump(registry.record(prompts, registry.load()))
        except ValueError as error:
            print(error)
            return 1
    found = registry.problems(prompts, registry.load())
    for problem in found:
        print(problem)
    for agent, entry in registry.current(prompts).items():
        print(f"{agent:<20} {entry['version']:<8} {entry['hash'][:12]}")
    return 1 if found else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MatchIQ prompt registry")
    parser.add_argument("--record", action="store_true", help="append the current prompts")
    sys.exit(main(record=parser.parse_args().record))
