"""Model port backed by Microsoft Agent Framework `Agent`, for any framework chat client.

Used with `FoundryChatClient` (target integration) and with `OpenAIChatClient` pointed at a local
Ollama server (real local inference). Structured output uses `options={"response_format": Model}`
and `AgentResponse.value`, as documented on Microsoft Learn and guarded by
`tests/test_foundry_sdk.py`. Output that does not parse raises `ModelOutputError`, which the
runner counts as a failed attempt.
"""

from collections.abc import Mapping
from typing import Any, Final

from agent_framework import Agent, SupportsChatGetResponse
from pydantic import BaseModel, ValidationError

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, RunProvider
from matchiq_agents.guard.data_block import render_prompt
from matchiq_agents.limits import MAX_OUTPUT_TOKENS
from matchiq_agents.models.port import ModelOutputError, ModelUsage

USER_TASK: Final = (
    "Process the data block according to your instructions. Answer only with JSON that matches "
    "the required response schema."
)
EMPTY_OUTPUT: Final = "model returned no structured output"
WRONG_TYPE: Final = "model returned {actual}, expected {expected}"
UNPARSEABLE: Final = "model output does not match {expected}"


class AgentFrameworkModel:
    def __init__(
        self,
        client: SupportsChatGetResponse[Any],
        provider: RunProvider,
        deployment: str,
        run_options: Mapping[str, object] | None = None,
    ) -> None:
        self._client = client
        self._run_options = dict(run_options or {})
        self._provider = provider
        self._deployment = deployment
        self._agents: dict[tuple[AgentName, str], Agent[Any]] = {}

    @property
    def provider(self) -> RunProvider:
        return self._provider

    @property
    def deployment(self) -> str | None:
        return self._deployment

    def _agent(self, agent_name: AgentName, instructions: str) -> Agent[Any]:
        key = (agent_name, instructions)
        if key not in self._agents:
            self._agents[key] = Agent(
                client=self._client, name=agent_name.value, instructions=instructions
            )
        return self._agents[key]

    async def generate[T: BaseModel](
        self,
        agent_name: AgentName,
        instructions: str,
        payload: BaseModel,
        response_model: type[T],
        deadline: Deadline,
    ) -> tuple[T, ModelUsage]:
        agent = self._agent(agent_name, instructions)
        response = await agent.run(
            render_prompt(USER_TASK, payload),
            options={
                **self._run_options,
                "response_format": response_model,
                "max_tokens": MAX_OUTPUT_TOKENS[agent_name],
            },
        )
        try:
            value = response.value
        except (ValidationError, ValueError) as error:
            raise ModelOutputError(UNPARSEABLE.format(expected=response_model.__name__)) from error
        if value is None:
            raise ModelOutputError(EMPTY_OUTPUT)
        if not isinstance(value, response_model):
            detail = WRONG_TYPE.format(
                actual=type(value).__name__, expected=response_model.__name__
            )
            raise ModelOutputError(detail)
        usage = response.usage_details or {}
        return value, ModelUsage(
            provider=self._provider,
            model_deployment=self._deployment,
            tokens_in=usage.get("input_token_count"),
            tokens_out=usage.get("output_token_count"),
        )
