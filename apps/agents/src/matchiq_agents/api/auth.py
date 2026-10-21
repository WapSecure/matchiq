"""Worker → agents service-token authentication (SECURITY_STANDARDS.md access model)."""

import hmac
from typing import Annotated, Final

from fastapi import Depends, FastAPI, Header, Request
from fastapi.responses import JSONResponse
from starlette import status

from matchiq_agents.api.problems import problem_response
from matchiq_agents.constants import BEARER_PREFIX
from matchiq_agents.health import SettingsDep

UNAUTHORIZED_DETAIL: Final = "A valid service token is required."
CHALLENGE: Final = {"WWW-Authenticate": "Bearer"}


class UnauthorizedError(Exception):
    pass


def _presented_token(authorization: str | None) -> str:
    if authorization is None or not authorization.startswith(BEARER_PREFIX):
        return ""
    return authorization.removeprefix(BEARER_PREFIX).strip()


def require_service_token(
    settings: SettingsDep, authorization: Annotated[str | None, Header()] = None
) -> None:
    expected = settings.agents_service_token.get_secret_value().encode()
    presented = _presented_token(authorization).encode()
    if not hmac.compare_digest(presented, expected):
        raise UnauthorizedError


ServiceAuth = Annotated[None, Depends(require_service_token)]


async def _on_unauthorized(request: Request, _exc: Exception) -> JSONResponse:
    response = problem_response(request, status.HTTP_401_UNAUTHORIZED, UNAUTHORIZED_DETAIL)
    response.headers.update(CHALLENGE)
    return response


def install_auth_handlers(app: FastAPI) -> None:
    app.add_exception_handler(UnauthorizedError, _on_unauthorized)
