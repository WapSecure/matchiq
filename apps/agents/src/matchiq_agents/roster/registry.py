"""Append-only prompt registry: every (agent, version) maps to exactly one content hash.

`prompt_registry.json` sits next to this module. `scripts/prompt_registry.py --record` appends
the current prompts; it refuses to reuse a version for different text. The CI gate
(`tests/test_prompt_registry.py`) fails on any prompt that is not recorded.
"""

import json
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Final

from matchiq_agents.roster.prompts import Prompt

REGISTRY_PATH: Final = Path(__file__).with_name("prompt_registry.json")
UNRECORDED: Final = "{agent} {version} ({hash}) is not in the prompt registry; run --record"
VERSION_REUSED: Final = "{agent} {version} already maps to other text; bump the version"

Registry = dict[str, dict[str, str]]


def load(path: Path = REGISTRY_PATH) -> Registry:
    if not path.exists():
        return {}
    raw: Registry = json.loads(path.read_text())
    return raw


def problems(prompts: Iterable[Prompt], registry: Mapping[str, Mapping[str, str]]) -> list[str]:
    found: list[str] = []
    for prompt in prompts:
        recorded = registry.get(prompt.agent.value, {}).get(prompt.version)
        values = {"agent": prompt.agent.value, "version": prompt.version}
        if recorded is None:
            found.append(UNRECORDED.format(hash=prompt.content_hash[:12], **values))
        elif recorded != prompt.content_hash:
            found.append(VERSION_REUSED.format(**values))
    return found


def record(prompts: Iterable[Prompt], registry: Mapping[str, Mapping[str, str]]) -> Registry:
    """The registry plus the current prompts. Raises when a version would change its text."""
    updated = {agent: dict(versions) for agent, versions in registry.items()}
    for prompt in prompts:
        versions = updated.setdefault(prompt.agent.value, {})
        known = versions.get(prompt.version)
        if known is not None and known != prompt.content_hash:
            detail = VERSION_REUSED.format(agent=prompt.agent.value, version=prompt.version)
            raise ValueError(detail)
        versions[prompt.version] = prompt.content_hash
    return updated


def dump(registry: Registry, path: Path = REGISTRY_PATH) -> None:
    path.write_text(json.dumps(registry, indent=2, sort_keys=True) + "\n")


def current(prompts: Iterable[Prompt]) -> dict[str, dict[str, str]]:
    """`{agent: {version, hash}}` as recorded in evaluation artifacts."""
    return {p.agent.value: {"version": p.version, "hash": p.content_hash} for p in prompts}
