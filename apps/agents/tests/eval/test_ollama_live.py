"""Live local-Ollama evaluation. Opt in: `OLLAMA_LIVE=1 uv run pytest -m ollama`.

Small local models may emit invalid JSON or ungrounded text; the gate here is the same as for the
mock: zero unsupported claims reach the output, whatever mix of agent and template text results.
"""

import os

import pytest
from pydantic import SecretStr

from matchiq_agents.clock import SystemClock
from matchiq_agents.settings import ModelProvider, Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.eval.cases import ADVERSARIAL_INPUTS, GOLDEN, EvalCase
from tests.eval.harness import evaluate
from tests.support.builders import build_request

LIVE = os.environ.get("OLLAMA_LIVE") == "1"
pytestmark = [
    pytest.mark.ollama,
    pytest.mark.skipif(not LIVE, reason="set OLLAMA_LIVE=1 to run against a local Ollama"),
]
LIVE_CASES = (*GOLDEN[:6], *ADVERSARIAL_INPUTS[:3])


@pytest.mark.parametrize("case", LIVE_CASES, ids=lambda c: c.name)
async def test_live_ollama_output_is_grounded(case: EvalCase) -> None:
    settings = Settings(agents_service_token=SecretStr(TOKEN), model_provider=ModelProvider.OLLAMA)
    request = build_request(case.spec)
    result = await build_orchestrator(settings, SystemClock()).run(request)
    report = evaluate(case.name, request, result)
    assert report.violations == 0, report
