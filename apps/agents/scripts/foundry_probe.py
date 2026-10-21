"""Verifies Foundry access end to end with a structured-output call.

Usage: MODEL_PROVIDER=foundry FOUNDRY_PROJECT_ENDPOINT=... FOUNDRY_MODEL=... \
       AGENTS_SERVICE_TOKEN=... uv run python scripts/foundry_probe.py
"""

import asyncio
import sys
import time

from pydantic import BaseModel

from matchiq_agents.providers.foundry import build_agent, build_chat_client
from matchiq_agents.settings import Settings

STARTING_XI = 11
PROBE_PROMPT = "Return the number of players in a starting football XI."


class ProbeAnswer(BaseModel):
    players: int


async def probe() -> int:
    settings = Settings()  # pyright: ignore[reportCallIssue]
    agent = build_agent(
        build_chat_client(settings), name="FoundryProbe", instructions="Answer with JSON only."
    )
    started = time.perf_counter()
    response = await agent.run(PROBE_PROMPT, options={"response_format": ProbeAnswer})
    elapsed_ms = round((time.perf_counter() - started) * 1000)
    answer = response.value
    ok = isinstance(answer, ProbeAnswer) and answer.players == STARTING_XI
    print(f"deployment={settings.foundry_model} latency_ms={elapsed_ms} structured_ok={ok}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(probe()))
