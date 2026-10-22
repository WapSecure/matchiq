"""CI regression gate for prompts (docs/ai/EVALUATION.md).

1. Every prompt's (version, content hash) is recorded in the append-only registry, so prompt
   text cannot change without a version bump.
2. The checked-in live evaluation baseline was recorded against exactly the current prompts and
   shows zero grounding violations, so a prompt cannot ship without a fresh offline evaluation.
"""

import json
from dataclasses import replace
from pathlib import Path

import pytest

from matchiq_agents.roster import registry
from matchiq_agents.roster.prompts import MATCH_ANALYST, PROMPTS

BASELINE = Path(__file__).parent / "eval" / "baselines" / "ollama-qwen2.5-7b-instruct.json"


def test_every_prompt_is_recorded_in_the_registry() -> None:
    assert registry.problems(PROMPTS.values(), registry.load()) == []


def test_changed_text_under_an_old_version_is_caught() -> None:
    edited = replace(MATCH_ANALYST, instructions=MATCH_ANALYST.instructions + " Be brief.")
    found = registry.problems([edited], registry.load())
    assert found
    assert "bump the version" in found[0]
    with pytest.raises(ValueError, match="bump the version"):
        registry.record([edited], registry.load())


def test_a_new_version_is_unrecorded_until_recorded() -> None:
    bumped = replace(MATCH_ANALYST, version="99.0.0", instructions="new text")
    assert "not in the prompt registry" in registry.problems([bumped], registry.load())[0]
    assert registry.problems([bumped], registry.record([bumped], registry.load())) == []


def test_content_hash_covers_the_instructions() -> None:
    edited = replace(MATCH_ANALYST, instructions=MATCH_ANALYST.instructions + ".")
    assert edited.content_hash != MATCH_ANALYST.content_hash
    assert len(MATCH_ANALYST.content_hash) == 64


def test_live_baseline_matches_current_prompts_and_is_grounded() -> None:
    baseline = json.loads(BASELINE.read_text())
    assert baseline["prompts"] == registry.current(PROMPTS.values()), (
        "prompts changed since the recorded ollama baseline; rerun scripts/run_eval.py "
        "--provider ollama --baseline (docs/ai/EVALUATION.md)"
    )
    assert baseline["violations"] == 0
    assert all(case["violations"] == 0 for case in baseline["cases"])
