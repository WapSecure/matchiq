"""Runs the golden + adversarial evaluation against a chosen model provider and prints a summary.

Usage (from apps/agents):
    uv run python scripts/run_eval.py --provider mock
    MODEL_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b-instruct uv run python scripts/run_eval.py \
        --provider ollama --deadline-ms 120000 --cases 8
    FOUNDRY_PROJECT_ENDPOINT=... FOUNDRY_MODEL=... uv run python scripts/run_eval.py \
        --provider foundry

`--deadline-ms` replaces the default request deadline (cases that set their own, such as
`tight_deadline`, keep it). `--cases N` runs an evenly spaced, deterministic sample of N
cases; `--case NAME` adds a named case.

Never part of CI: ollama and foundry make real model calls. Exit code 1 if any case leaks an
unsupported claim.
"""

import argparse
import asyncio
import os
import statistics
import sys
import time
from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.eval.cases import ADVERSARIAL_INPUTS, BASE, GOLDEN, EvalCase
from tests.eval.harness import CaseReport, evaluate
from tests.support.builders import build_request

from matchiq_agents.clock import SystemClock
from matchiq_agents.contracts.types import PipelineResult, RunProvider
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator

PROVIDERS = ("mock", "ollama", "foundry")
PLACEHOLDER_TOKEN = "eval-" + "x" * 32
ROW = "{:<32} {:<9} {:<15} {:>5} {:>5} {:>5} {:>5} {:>7} {:>8} {:>7}"
HEADER = ROW.format(
    "case", "status", "sources", "calls", "unsup", "unkn", "leak", "locFb", "ms", "tokens"
)
P95 = 0.95


def _settings(provider: str) -> Settings:
    os.environ["MODEL_PROVIDER"] = provider
    os.environ.setdefault("AGENTS_SERVICE_TOKEN", PLACEHOLDER_TOKEN)
    return Settings()  # pyright: ignore[reportCallIssue]


def _tokens(result: PipelineResult) -> int:
    return sum((run.tokensIn or 0) + (run.tokensOut or 0) for run in result.runs)


def model_calls(result: PipelineResult) -> int:
    """Requests sent to the model, retries included; template and deterministic runs excluded."""
    return sum(run.retries + 1 for run in result.runs if run.provider is not RunProvider.template)


def select_cases(
    count: int | None, deadline_ms: int | None, extra: Sequence[str] = ()
) -> list[EvalCase]:
    every = [*GOLDEN, *ADVERSARIAL_INPUTS]
    cases = every
    if count is not None and 0 < count < len(every):
        stride = len(every) / count
        cases = [every[int(index * stride)] for index in range(count)]
    cases += [case for case in every if case.name in extra and case not in cases]
    if deadline_ms is None:
        return cases
    return [
        replace(case, spec=replace(case.spec, deadline_ms=deadline_ms))
        if case.spec.deadline_ms == BASE.deadline_ms
        else case
        for case in cases
    ]


async def _run_case(
    orchestrator: PipelineOrchestrator, case: EvalCase
) -> tuple[CaseReport, float, PipelineResult]:
    request = build_request(case.spec)
    started = time.perf_counter()
    result = await orchestrator.run(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    return evaluate(case.name, request, result), elapsed_ms, result


def _row(report: CaseReport, elapsed_ms: float, result: PipelineResult) -> str:
    return ROW.format(
        report.name[:32],
        report.status,
        "+".join(sorted(report.sources)) or "-",
        model_calls(result),
        len(report.unsupported_numbers),
        len(report.unknown_entities),
        len(report.injection_leaks),
        report.locale_fallbacks,
        round(elapsed_ms),
        _tokens(result),
    )


def _details(report: CaseReport, result: PipelineResult) -> str:
    issues = result.verification.issues if result.verification is not None else []
    return " | ".join(
        [
            f"reason={result.fallbackReason or '-'}",
            f"issues={[f'{found.code.value}: {found.detail}' for found in issues][:6]}",
            f"unsupported={report.unsupported_numbers}",
            f"unknown={report.unknown_entities}",
            f"leaks={report.injection_leaks}",
            f"locale_changes={report.locale_numeral_changes}",
        ]
    )


def percentile(values: list[float], share: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, round(share * len(ordered)) - 1)]


def _agent_latencies(results: list[PipelineResult]) -> str:
    by_agent: defaultdict[str, list[float]] = defaultdict(list)
    for result in results:
        for run in result.runs:
            if run.provider is not RunProvider.template:
                by_agent[f"{run.agent.value}:{run.outcome.value}"].append(run.latencyMs)
    return " ".join(
        f"{key}=n{len(values)}/p50 {statistics.median(values):.0f}"
        for key, values in sorted(by_agent.items())
    )


def _summary(
    reports: list[CaseReport], latencies: list[float], results: list[PipelineResult]
) -> str:
    statuses = Counter(report.status for report in reports)
    sources = Counter(
        f"{draft.source.value}{'+localeFallback' if draft.localeFallback else ''}"
        for result in results
        for draft in result.narratives
    )
    outcomes = Counter(
        f"{run.provider.value}:{run.outcome.value}" for result in results for run in result.runs
    )
    calls = [float(model_calls(result)) for result in results]
    return "\n".join(
        [
            f"cases={len(reports)} violations={sum(r.violations for r in reports)}",
            f"statuses={dict(statuses)}",
            f"narrative_sources={dict(sources)}",
            f"agent_run_outcomes={dict(outcomes)}",
            f"model_calls_per_run p50={statistics.median(calls):.0f} max={max(calls):.0f}",
            f"latency_ms p50={statistics.median(latencies):.0f} "
            f"p95={percentile(latencies, P95):.0f}",
            f"agent_latency_ms {_agent_latencies(results)}",
        ]
    )


async def main(provider: str, cases: list[EvalCase], *, verbose: bool) -> int:
    settings = _settings(provider)
    orchestrator = build_orchestrator(settings, SystemClock())
    print(f"provider={provider} deployment={orchestrator.model.deployment or '-'}")
    print(HEADER)
    reports: list[CaseReport] = []
    latencies: list[float] = []
    results: list[PipelineResult] = []
    for case in cases:
        report, elapsed_ms, result = await _run_case(orchestrator, case)
        reports.append(report)
        latencies.append(elapsed_ms)
        results.append(result)
        print(_row(report, elapsed_ms, result), flush=True)
        if verbose or report.violations:
            print(f"    {_details(report, result)}", flush=True)
    print(_summary(reports, latencies, results))
    return 1 if any(report.violations for report in reports) else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MatchIQ agent evaluation")
    parser.add_argument("--provider", choices=PROVIDERS, default="mock")
    parser.add_argument("--deadline-ms", type=int, default=None, help="request deadline override")
    parser.add_argument("--cases", type=int, default=None, help="evenly spaced sample size")
    parser.add_argument("--case", action="append", default=[], help="also run this case by name")
    parser.add_argument("--verbose", action="store_true", help="print reasons and issues per case")
    args = parser.parse_args()
    selected = select_cases(args.cases, args.deadline_ms, args.case)
    sys.exit(asyncio.run(main(args.provider, selected, verbose=args.verbose)))
