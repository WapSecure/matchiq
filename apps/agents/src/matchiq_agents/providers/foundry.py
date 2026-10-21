from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential, ManagedIdentityCredential

from matchiq_agents.settings import ModelProvider, Settings


class FoundryNotConfiguredError(RuntimeError):
    pass


def build_credential(settings: Settings) -> ManagedIdentityCredential | AzureCliCredential:
    """Managed identity in Azure; developer CLI login locally. Never API keys."""
    if settings.azure_client_id:
        return ManagedIdentityCredential(client_id=settings.azure_client_id)
    return AzureCliCredential()


def build_chat_client(settings: Settings) -> FoundryChatClient:
    if settings.model_provider is not ModelProvider.FOUNDRY:
        raise FoundryNotConfiguredError("MODEL_PROVIDER is not foundry")
    if settings.foundry_project_endpoint is None or settings.foundry_model is None:
        raise FoundryNotConfiguredError("Foundry endpoint and model must be configured")
    return FoundryChatClient(
        project_endpoint=str(settings.foundry_project_endpoint),
        model=settings.foundry_model,
        credential=build_credential(settings),
    )


def build_agent(client: FoundryChatClient, *, name: str, instructions: str) -> Agent:
    return Agent(client=client, name=name, instructions=instructions)
