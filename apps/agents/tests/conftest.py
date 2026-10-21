import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from matchiq_agents.app import create_app
from matchiq_agents.settings import Settings

TOKEN = "t" * 32


@pytest.fixture
def settings() -> Settings:
    return Settings(agents_service_token=SecretStr(TOKEN), app_version="1.2.3")


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
