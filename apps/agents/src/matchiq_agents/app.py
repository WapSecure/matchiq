import asyncio
from collections.abc import AsyncGenerator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager, suppress

from fastapi import FastAPI

from matchiq_agents import health
from matchiq_agents.api import pipeline
from matchiq_agents.api.auth import install_auth_handlers
from matchiq_agents.api.problems import install_problem_handlers
from matchiq_agents.clock import Clock, SystemClock
from matchiq_agents.constants import SERVICE_NAME
from matchiq_agents.models.port import ModelPort
from matchiq_agents.providers.ollama import warm_up_ollama
from matchiq_agents.settings import Settings
from matchiq_agents.telemetry import RequestContextMiddleware, TelemetrySettings, configure_tracing
from matchiq_agents.wiring import build_service


def _lifespan(settings: Settings) -> Callable[[FastAPI], AbstractAsyncContextManager[None]]:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        task = (
            asyncio.create_task(warm_up_ollama(settings))
            if settings.is_local and settings.ollama_warmup
            else None
        )
        try:
            yield
        finally:
            if task is not None:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task

    return lifespan


def create_app(
    settings: Settings | None = None,
    *,
    model: ModelPort | None = None,
    clock: Clock | None = None,
    telemetry: TelemetrySettings | None = None,
) -> FastAPI:
    resolved = settings or Settings()  # pyright: ignore[reportCallIssue]
    app = FastAPI(
        title=SERVICE_NAME,
        version=resolved.app_version,
        docs_url=None,
        redoc_url=None,
        lifespan=_lifespan(resolved),
    )
    app.state.settings = resolved
    app.state.orchestrator = build_service(resolved, clock or SystemClock(), model)
    install_problem_handlers(app)
    install_auth_handlers(app)
    app.include_router(health.router)
    app.include_router(pipeline.router)
    # Added before tracing so the request span encloses it and access lines carry trace ids.
    app.add_middleware(RequestContextMiddleware)
    configure_tracing(app, telemetry or TelemetrySettings())
    return app
