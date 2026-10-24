"""Input shaping: the Analyst sees the top metrics, the checks keep the full evidence."""

from pydantic import BaseModel, SecretStr

from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.types import AgentName, InsightKind, PipelineStatus
from matchiq_agents.domain.context import is_context_ref
from matchiq_agents.domain.facts import build_fact_view
from matchiq_agents.domain.relevance import ANALYST_METRIC_LIMIT, ranked_refs
from matchiq_agents.models.port import ModelUsage
from matchiq_agents.roster.schemas import AnalystInput, AnalystOutput, CitedValueOut, ClaimOut
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.eval.cases import GOLDEN
from tests.support.builders import CaseSpec, build_request
from tests.support.models import FakeClock, ScriptedModel

REAL = next(case for case in GOLDEN if case.name == "real_packet_shape").spec
SETTINGS = Settings(agents_service_token=SecretStr(TOKEN))


def test_real_packet_ranks_the_kind_family_and_subject_side_first() -> None:
    view = build_fact_view(build_request(REAL))
    assert view.subject_side == "away"
    top = ranked_refs(view.metrics, view.kind, view.subject_side)
    assert len(top) == ANALYST_METRIC_LIMIT
    assert top == [
        "shots.away.rolling5m",
        "shots.home.rolling5m",
        "shotsOnTarget.away.rolling5m",
        "shotsOnTarget.home.rolling5m",
        "finalThirdEntries.away.rolling5m",
        "finalThirdEntries.home.rolling5m",
    ]


def test_previous_windows_rank_last_except_for_swings() -> None:
    metrics = {"pressures.home.previous10m": 6.0, "pressures.home.rolling10m": 14.0}
    assert ranked_refs(metrics, InsightKind.HIGH_REGAINS, "home")[0] == "pressures.home.rolling10m"
    swing = ranked_refs(metrics, InsightKind.PRESSURE_SWING, "home")
    assert set(swing) == set(metrics)


def test_ranking_is_stable_for_small_packets() -> None:
    metrics = {"highRecoveries.home.rolling5m": 5.0, "shots.home.rolling5m": 3.0}
    assert ranked_refs(metrics, InsightKind.HIGH_REGAINS, "home") == list(metrics)


async def test_analyst_payload_is_trimmed_but_any_evidence_metric_may_be_cited() -> None:
    seen: list[int] = []
    view = build_fact_view(build_request(REAL))
    outside = next(ref for ref in view.metrics if ref.startswith("momentum.home"))

    def cite_outside(answer: BaseModel, _count: int) -> BaseModel:
        assert isinstance(answer, AnalystOutput)
        claim = ClaimOut(
            claim_type="OBSERVATION",
            text=f"Momentum reads {view.metrics[outside]} for the hosts.",
            evidence_event_ids=list(view.event_ids),
            cited_values=[CitedValueOut(metric_ref=outside, value=view.metrics[outside])],
        )
        return answer.model_copy(update={"claims": [claim]})

    class Recording(ScriptedModel):
        async def generate[T: BaseModel](
            self,
            agent_name: AgentName,
            instructions: str,
            payload: BaseModel,
            response_model: type[T],
            deadline: Deadline,
        ) -> tuple[T, ModelUsage]:
            if isinstance(payload, AnalystInput):
                metrics = payload.facts.computed_metrics
                seen.append(len([ref for ref in metrics if not is_context_ref(ref)]))
            return await super().generate(
                agent_name, instructions, payload, response_model, deadline
            )

    model = Recording({AgentName.MATCH_ANALYST: cite_outside})
    result = await build_orchestrator(SETTINGS, FakeClock(), model).run(build_request(REAL))
    # The evidence is trimmed; the engine's moment context is shown in full (MQ-068).
    assert seen == [ANALYST_METRIC_LIMIT]
    assert result.analysis is not None
    assert result.analysis.claims[0].citedValues[0].metricRef == outside
    assert result.status in {PipelineStatus.VERIFIED, PipelineStatus.FALLBACK}


def test_side_is_unknown_without_a_subject_team() -> None:
    assert build_fact_view(build_request(CaseSpec(team_id=None))).subject_side is None
