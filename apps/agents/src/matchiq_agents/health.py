from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from matchiq_agents.constants import FOUNDRY_CHECK, HEALTH_PREFIX, OLLAMA_CHECK, SERVICE_NAME
from matchiq_agents.contracts.generated.HealthStatus import Checks, HealthStatus, Status
from matchiq_agents.providers.ollama import probe_ollama
from matchiq_agents.settings import ModelProvider, Settings

router = APIRouter(prefix=HEALTH_PREFIX, tags=["health"])

MOCK_PROVIDER_DETAIL = "mock provider; deterministic templates only"
OLLAMA_READY = "local Ollama model {model} (not Foundry)"
OLLAMA_UNREACHABLE = "Ollama endpoint unreachable; template fallback only"
OLLAMA_MODEL_MISSING = "Ollama reachable but model {model} is not pulled"


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_settings)]


def _report(settings: Settings, state: Status, checks: dict[str, Checks]) -> HealthStatus:
    return HealthStatus(
        status=state, service=SERVICE_NAME, version=settings.app_version, checks=checks
    )


def _static_check(settings: Settings) -> Checks:
    if settings.model_provider is ModelProvider.FOUNDRY:
        return Checks(status=Status.ok, detail=f"deployment {settings.foundry_model}")
    return Checks(status=Status.degraded, detail=MOCK_PROVIDER_DETAIL)


async def _ollama_check(settings: Settings) -> Checks:
    probe = await probe_ollama(settings)
    if not probe.reachable:
        return Checks(status=Status.degraded, detail=OLLAMA_UNREACHABLE)
    if not probe.model_available:
        return Checks(
            status=Status.degraded, detail=OLLAMA_MODEL_MISSING.format(model=settings.ollama_model)
        )
    return Checks(status=Status.ok, detail=OLLAMA_READY.format(model=settings.ollama_model))


@router.get("/live")
def live(settings: SettingsDep) -> HealthStatus:
    return _report(settings, Status.ok, {})


@router.get("/ready")
async def ready(settings: SettingsDep, response: Response) -> HealthStatus:
    """Reports whether a real model is wired. Mock mode is ready but flagged as degraded."""
    if settings.model_provider is ModelProvider.OLLAMA:
        name, check = OLLAMA_CHECK, await _ollama_check(settings)
    else:
        name, check = FOUNDRY_CHECK, _static_check(settings)
    if check.status is Status.unavailable:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return _report(settings, check.status, {name: check})
