"""Local Ollama inference through Agent Framework's GA OpenAI-compatible client.

Follows Microsoft Learn, "Ollama" provider page (updated 2026-10-15), OpenAI Compatible tab:
`OpenAIChatClient(api_key="ollama", base_url=OLLAMA_ENDPOINT, model=OLLAMA_MODEL)`. The beta
`agent-framework-ollama` package is deliberately not used.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Final
from urllib.parse import urlsplit, urlunsplit

import httpx
from agent_framework.openai import OpenAIChatClient
from pydantic import BaseModel

from matchiq_agents.constants import (
    OLLAMA_PLACEHOLDER_API_KEY,
    OLLAMA_PROBE_TIMEOUT_S,
    OLLAMA_TAGS_PATH,
)
from matchiq_agents.settings import ModelProvider, Settings

LATEST_TAG = ":latest"
# Ollama's OpenAI-compatible `/v1/responses` honours `temperature` and `max_output_tokens` but
# ignores `keep_alive` and `options` (num_ctx, num_predict), measured on Ollama 0.40.7. Those
# are server settings: OLLAMA_KEEP_ALIVE, OLLAMA_CONTEXT_LENGTH (see `.env.example`).
OLLAMA_TEMPERATURE: Final = 0.2
OLLAMA_RUN_OPTIONS: Final[Mapping[str, object]] = MappingProxyType(
    {"temperature": OLLAMA_TEMPERATURE}
)


class OllamaNotConfiguredError(RuntimeError):
    pass


def _require(settings: Settings) -> tuple[str, str]:
    if settings.model_provider is not ModelProvider.OLLAMA:
        raise OllamaNotConfiguredError("MODEL_PROVIDER is not ollama")
    if settings.ollama_endpoint is None or settings.ollama_model is None:
        raise OllamaNotConfiguredError("OLLAMA_ENDPOINT and OLLAMA_MODEL must be configured")
    return str(settings.ollama_endpoint), settings.ollama_model


def build_ollama_client(settings: Settings) -> OpenAIChatClient:
    endpoint, model = _require(settings)
    return OpenAIChatClient(api_key=OLLAMA_PLACEHOLDER_API_KEY, base_url=endpoint, model=model)


def tags_url(endpoint: str) -> str:
    """`http://host:11434/v1/` → `http://host:11434/api/tags` (Ollama's native model list)."""
    parts = urlsplit(endpoint)
    return urlunsplit((parts.scheme, parts.netloc, OLLAMA_TAGS_PATH, "", ""))


@dataclass(frozen=True, slots=True)
class OllamaProbe:
    reachable: bool
    model_available: bool


class _Tag(BaseModel):
    name: str


class _Tags(BaseModel):
    """The subset of Ollama's `GET /api/tags` response this probe reads."""

    models: list[_Tag]


def _has_model(raw: bytes, model: str) -> bool:
    names = {tag.name for tag in _Tags.model_validate_json(raw).models}
    return bool({model, model.removesuffix(LATEST_TAG), f"{model}{LATEST_TAG}"} & names)


async def probe_ollama(
    settings: Settings, transport: httpx.AsyncBaseTransport | None = None
) -> OllamaProbe:
    endpoint, model = _require(settings)
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_PROBE_TIMEOUT_S, transport=transport) as client:
            response = await client.get(tags_url(endpoint))
            response.raise_for_status()
            return OllamaProbe(reachable=True, model_available=_has_model(response.content, model))
    except (httpx.HTTPError, ValueError):
        return OllamaProbe(reachable=False, model_available=False)
