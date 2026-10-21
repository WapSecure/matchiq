from fastapi import FastAPI

from matchiq_agents import health
from matchiq_agents.constants import SERVICE_NAME
from matchiq_agents.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or Settings()  # pyright: ignore[reportCallIssue]
    app = FastAPI(title=SERVICE_NAME, version=resolved.app_version, docs_url=None, redoc_url=None)
    app.state.settings = resolved
    app.include_router(health.router)
    return app
