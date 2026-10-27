"""`POST /api/v1/pipeline/runs`: one insight in, a `PipelineResult` out. Handlers stay thin."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from matchiq_agents.api.auth import ServiceAuth
from matchiq_agents.constants import PIPELINE_RUNS_PATH, REQUIRED_NULLABLE_FIELDS
from matchiq_agents.contracts.types import PipelineRequest, PipelineResult
from matchiq_agents.pipeline.orchestrator import PipelineService

router = APIRouter(tags=["pipeline"])


def get_orchestrator(request: Request) -> PipelineService:
    orchestrator: PipelineService = request.app.state.orchestrator
    return orchestrator


OrchestratorDep = Annotated[PipelineService, Depends(get_orchestrator)]


async def parse_request(request: Request) -> PipelineRequest:
    """Parsed after authentication so unauthenticated callers learn nothing about the schema."""
    try:
        return PipelineRequest.model_validate_json(await request.body())
    except ValidationError as error:
        raise RequestValidationError(error.errors(include_input=False)) from error


def to_wire(result: PipelineResult) -> dict[str, Any]:
    """Optional fields that hold no value are omitted; required nullable fields stay as nulls.

    Dropping by value, not by "was it assigned", matters: a draft rebuilt from another draft's
    dump carries an explicit `breakdown: null`, which the worker's contract rejects.
    """
    wire = result.model_dump(mode="json", exclude_none=True)
    for field in REQUIRED_NULLABLE_FIELDS:
        wire.setdefault(field, None)
    return wire


@router.post(PIPELINE_RUNS_PATH, response_model=None)
async def create_run(
    request: Request, _auth: ServiceAuth, orchestrator: OrchestratorDep
) -> JSONResponse:
    pipeline_request = await parse_request(request)
    result = await orchestrator.run(pipeline_request)
    return JSONResponse(to_wire(result))
