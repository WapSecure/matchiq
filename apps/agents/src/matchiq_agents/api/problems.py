"""RFC 9457 problem responses, matching `libs/server-kit` (type URNs, titles, field paths)."""

from collections.abc import Sequence
from typing import Any, Final

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status

from matchiq_agents.constants import PROBLEM_CONTENT_TYPE, PROBLEM_TYPE_PREFIX
from matchiq_agents.contracts.generated.ProblemDetails import Error, ProblemDetails

TITLES: Final = {
    status.HTTP_401_UNAUTHORIZED: ("unauthorized", "Authentication required"),
    status.HTTP_422_UNPROCESSABLE_CONTENT: ("validation-failed", "Request validation failed"),
}
ROOT_PATH: Final = "$"


def _path(location: Sequence[int | str]) -> str:
    parts = [str(part) for part in location if part != "body"]
    return ".".join([ROOT_PATH, *parts]) if parts else ROOT_PATH


def problem_response(
    request: Request, code: int, detail: str | None = None, errors: list[Error] | None = None
) -> JSONResponse:
    slug, title = TITLES[code]
    problem = ProblemDetails(
        type=f"{PROBLEM_TYPE_PREFIX}{slug}",
        title=title,
        status=code,
        detail=detail,
        instance=request.url.path,
        errors=errors,
    )
    return JSONResponse(
        problem.model_dump(mode="json", exclude_none=True),
        status_code=code,
        media_type=PROBLEM_CONTENT_TYPE,
    )


def validation_errors(raw: Sequence[Any]) -> list[Error]:
    """Field paths and messages only; input values are never echoed back."""
    return [
        Error(path=_path(error.get("loc", ())), message=str(error.get("msg", ""))) for error in raw
    ]


async def _on_validation_error(request: Request, exc: Exception) -> JSONResponse:
    errors = validation_errors(exc.errors()) if isinstance(exc, RequestValidationError) else []
    return problem_response(request, status.HTTP_422_UNPROCESSABLE_CONTENT, errors=errors)


def install_problem_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, _on_validation_error)
