"""Evaluation artifacts (docs/ai/EVALUATION.md).

`full` keeps every pipeline result for debugging. `baseline` is the compact record checked in
under `tests/eval/baselines/`: the prompts it ran against, per-case outcomes, the failure
taxonomy and a few real narratives. `tests/test_prompt_registry.py` gates CI on it.
"""

from collections import Counter
from dataclasses import asdict, dataclass
from datetime import UTC, datetime

from matchiq_agents.contracts.types import PipelineResult, RunProvider
from matchiq_agents.roster import registry
from matchiq_agents.roster.prompts import PROMPTS
from tests.eval.harness import CaseReport
from tests.eval.taxonomy import Rejection

SAMPLE_CASES = 3


@dataclass(frozen=True, slots=True)
class CaseRun:
    report: CaseReport
    latency_ms: float
    result: PipelineResult
    rejections: list[Rejection]

    @property
    def model_calls(self) -> int:
        runs = self.result.runs
        return sum(run.retries + 1 for run in runs if run.provider is not RunProvider.template)


def _source(draft_source: str, locale_fallback: bool) -> str:
    return draft_source + ("+localeFallback" if locale_fallback else "")


def _case(run: CaseRun) -> dict[str, object]:
    result = run.result
    return {
        "case": run.report.name,
        "status": run.report.status,
        "violations": run.report.violations,
        "latencyMs": round(run.latency_ms),
        "modelCalls": run.model_calls,
        "fallbackReason": result.fallbackReason,
        "narratives": dict(
            Counter(_source(d.source.value, d.localeFallback) for d in result.narratives)
        ),
        "rejections": [
            "/".join(part for part in (r.agent, r.rule, r.persona, r.locale) if part)
            for r in run.rejections
        ],
        "runs": [
            {
                "agent": r.agent.value,
                "provider": r.provider.value,
                "outcome": r.outcome.value,
                "latencyMs": r.latencyMs,
                "retries": r.retries,
                "tokensIn": r.tokensIn,
                "tokensOut": r.tokensOut,
                "repairs": [repair.code for repair in r.repairs or []],
            }
            for r in result.runs
        ],
    }


def _samples(runs: list[CaseRun]) -> list[dict[str, object]]:
    agent_runs = [
        run for run in runs if any(d.source.value == "AGENT" for d in run.result.narratives)
    ]
    return [
        {
            "case": run.report.name,
            "narratives": [
                {
                    "persona": d.persona.value,
                    "locale": d.locale.value,
                    "source": _source(d.source.value, d.localeFallback),
                    "headline": d.headline,
                    "body": d.body,
                }
                for d in run.result.narratives
            ],
            "overlay": run.result.overlay.model_dump(mode="json") if run.result.overlay else None,
        }
        for run in agent_runs[:SAMPLE_CASES]
    ]


def baseline(
    meta: dict[str, object], runs: list[CaseRun], summary: list[str], taxonomy: dict[str, int]
) -> dict[str, object]:
    narratives = Counter(
        _source(d.source.value, d.localeFallback) for run in runs for d in run.result.narratives
    )
    total = sum(narratives.values()) or 1
    return {
        **meta,
        "recordedAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "prompts": registry.current(PROMPTS.values()),
        "violations": sum(run.report.violations for run in runs),
        "agentShare": round(narratives["AGENT"] / total, 3),
        "narratives": dict(narratives),
        "summary": summary,
        "taxonomy": taxonomy,
        "cases": [_case(run) for run in runs],
        "samples": _samples(runs),
    }


def full(meta: dict[str, object], runs: list[CaseRun], summary: list[str]) -> dict[str, object]:
    return {
        **meta,
        "prompts": registry.current(PROMPTS.values()),
        "summary": summary,
        "cases": [
            {
                **_case(run),
                "rejections": [asdict(rejection) for rejection in run.rejections],
                "result": run.result.model_dump(mode="json", exclude_none=True),
            }
            for run in runs
        ],
    }
