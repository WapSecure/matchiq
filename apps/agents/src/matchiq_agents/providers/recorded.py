"""Provider `recorded`: replays real model output captured earlier (ADR-0042).

No model runs. A recorded moment is matched by stable facts, replayed through the live checks
after a short configurable pause, and labelled `recorded` in every run. A moment without a
recording gets the ordinary template result with the reason "no recording for this moment".
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from pathlib import Path

from matchiq_agents.constants import RECORDINGS_SUBDIR
from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.types import PipelineRequest, PipelineResult
from matchiq_agents.domain.facts import integrity_problems
from matchiq_agents.pipeline import step_reasons as outcomes
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator, PipelineService
from matchiq_agents.pipeline.result import rejected_result
from matchiq_agents.providers.recording import RecordingIndex, key_for, load_index
from matchiq_agents.providers.replay import Replay
from matchiq_agents.settings import ModelProvider, Settings

logger = logging.getLogger(__name__)
Sleep = Callable[[float], Awaitable[None]]
MS_PER_SECOND = 1000
MAX_PAUSE_SHARE = 0.5


class RecordedNotConfiguredError(RuntimeError):
    pass


def recordings_dir(settings: Settings) -> Path:
    if settings.model_provider is not ModelProvider.RECORDED:
        raise RecordedNotConfiguredError("MODEL_PROVIDER is not recorded")
    return settings.recorded_dir or Path(__file__).parent / RECORDINGS_SUBDIR


def load_recordings(settings: Settings) -> RecordingIndex:
    """Raises `RecordingError` when no recording can be loaded, so start-up fails fast."""
    index = load_index(recordings_dir(settings))
    logger.info("Loaded %d recorded moments", len(index))
    return index


class RecordedService:
    def __init__(
        self,
        pipeline: PipelineOrchestrator,
        index: RecordingIndex,
        latency_ms: int,
        sleep: Sleep = asyncio.sleep,
        timeouts: PipelineService | None = None,
    ) -> None:
        self._pipeline = pipeline
        self._index = index
        self._latency_ms = latency_ms
        self._sleep = sleep
        self._timeouts = timeouts

    async def run(self, request: PipelineRequest) -> PipelineResult:
        fault = request.fault if self._timeouts is not None else None
        if fault is FaultScenario.MODEL_TIMEOUT and self._timeouts is not None:
            # Every call times out, so nothing is replayed: the isolated faulted pipeline runs.
            return await self._timeouts.run(request)
        ctx = self._pipeline.context_for(request)
        problems = integrity_problems(request)
        if problems:
            return rejected_result(ctx.view, problems)
        moment = self._index.find(key_for(request, ctx.view))
        if moment is None:
            return await self._pipeline.template_only(request, outcomes.NO_RECORDING)
        pause_ms = min(self._latency_ms, ctx.view.deadline_ms * MAX_PAUSE_SHARE)
        if pause_ms > 0:
            await self._sleep(pause_ms / MS_PER_SECOND)
        return await Replay(ctx, moment, fault).run()
