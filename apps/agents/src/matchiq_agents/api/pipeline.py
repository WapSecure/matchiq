"""`POST /api/v1/pipeline/runs`: one insight in, a `PipelineResult` out. Handlers stay thin."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from matchiq_agents.api.auth import ServiceAuth
from matchiq_agents.constants import PIPELINE_RUNS_PATH
from matchiq_agents.contracts.types import PipelineRequest, PipelineResult
from matchiq_agents.faults.orchestrator import FaultAwareOrchestrator

router = APIRouter(tags=["pipeline"])


def get_orchestrator(request: Request) -> FaultAwareOrchestrator:
    orchestrator: FaultAwareOrchestrator = request.app.state.orchestrator
    return orchestrator


OrchestratorDep = Annotated[FaultAwareOrchestrator, Depends(get_orchestrator)]


async def parse_request(request: Request) -> PipelineRequest:
    """Parsed after authentication so unauthenticated callers learn nothing about the schema."""
    try:
        return PipelineRequest.model_validate_json(await request.body())
    except ValidationError as error:
        raise RequestValidationError(error.errors(include_input=False)) from error


def to_wire(result: PipelineResult) -> dict[str, Any]:
    """Unset optional fields are omitted; required nullable fields stay as explicit nulls."""
    return result.model_dump(mode="json", exclude_unset=True)


@router.post(PIPELINE_RUNS_PATH, response_model=None)
async def create_run(
    request: Request, _auth: ServiceAuth, orchestrator: OrchestratorDep
) -> JSONResponse:
    pipeline_request = await parse_request(request)
    result = await orchestrator.run(pipeline_request)
    return JSONResponse(to_wire(result))
