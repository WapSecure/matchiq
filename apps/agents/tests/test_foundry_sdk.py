"""Guards the Agent Framework API surface this service depends on against SDK drift."""

import inspect

import pytest
from pydantic import SecretStr

from matchiq_agents.providers.foundry import (
    FoundryNotConfiguredError,
    build_chat_client,
    build_credential,
)
from matchiq_agents.settings import Settings
from tests.conftest import TOKEN


def test_foundry_chat_client_accepts_expected_parameters() -> None:
    from agent_framework.foundry import FoundryChatClient

    params = inspect.signature(FoundryChatClient.__init__).parameters
    assert {"project_endpoint", "model", "credential"} <= set(params)


def test_agent_run_accepts_structured_output_options() -> None:
    from agent_framework import Agent

    assert "options" in inspect.signature(Agent.run).parameters


def test_mock_mode_refuses_to_build_a_foundry_client(settings: Settings) -> None:
    with pytest.raises(FoundryNotConfiguredError):
        build_chat_client(settings)


def test_managed_identity_is_used_when_client_id_is_set() -> None:
    settings = Settings(
        agents_service_token=SecretStr(TOKEN),
        azure_client_id="00000000-0000-0000-0000-000000000000",
    )
    assert type(build_credential(settings)).__name__ == "ManagedIdentityCredential"
