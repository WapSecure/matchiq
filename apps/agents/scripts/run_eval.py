"""Runs the golden + adversarial evaluation against a chosen model provider and prints a summary.

Usage (from apps/agents):
    uv run python scripts/run_eval.py --provider mock
    MODEL_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b-instruct uv run python scripts/run_eval.py \
        --provider ollama --deadline-ms 120000 --cases 8
    FOUNDRY_PROJECT_ENDPOINT=... FOUNDRY_MODEL=... uv run python scripts/run_eval.py \
        --provider foundry

`--json PATH` writes every case (rejections, narratives, overlay, runs) as a JSON artifact;
`--baseline PATH` writes the compact record checked in under tests/eval/baselines/, which the
CI prompt gate compares with the current prompts (docs/ai/EVALUATION.md).
The load average is printed at the start and end: local latency is meaningless without it.

`--deadline-ms` replaces the default request deadline (cases that set their own, such as
`tight_deadline`, keep it). `--cases N` runs an evenly spaced, deterministic sample of N
cases; `--case NAME` adds a named case.

Never part of CI: ollama and foundry make real model calls. Exit code 1 if any case leaks an
unsupported claim.
"""

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.eval import artifact
from tests.eval.artifact import CaseRun
from tests.eval.cases import ADVERSARIAL_INPUTS, BASE, GOLDEN, EvalCase
from tests.eval.harness import CaseReport, evaluate
from tests.eval.taxonomy import RejectionCollector, counts, narrative_share, taxonomy
from tests.support.builders import build_request

from matchiq_agents.clock import SystemClock
from matchiq_agents.contracts.types import PipelineResult, RunProvider
from matchiq_agents.models.resilience import StageTimer
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_model, build_orchestrator

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


def _load() -> str:
    return " ".join(f"{value:.2f}" for value in os.getloadavg())


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


async def main(
    provider: str,
    cases: list[EvalCase],
    *,
    verbose: bool,
    json_path: Path | None,
    baseline_path: Path | None,
) -> int:
    settings = _settings(provider)
    model = build_model(settings)
    # One latency history across cases, as in the service process.
    timer = StageTimer()
    collector = RejectionCollector().install()
    load_start = _load()
    print(f"provider={provider} deployment={model.deployment or '-'}")
    print(f"load_average_start={load_start}")
    print(HEADER)
    runs: list[CaseRun] = []
    for case in cases:
        # A fresh breaker per case: one slow case must not open the breaker for the rest.
        orchestrator = build_orchestrator(settings, SystemClock(), model, timer)
        report, elapsed_ms, result = await _run_case(orchestrator, case)
        runs.append(CaseRun(report, elapsed_ms, result, collector.drain()))
        print(_row(report, elapsed_ms, result), flush=True)
        if verbose or report.violations:
            print(f"    {_details(report, result)}", flush=True)
    results = [run.result for run in runs]
    rejections = [rejection for run in runs for rejection in run.rejections]
    summary = _summary([run.report for run in runs], [run.latency_ms for run in runs], results)
    print(summary)
    print(narrative_share(results))
    print(taxonomy(rejections))
    load_end = _load()
    print(f"load_average_end={load_end}")
    meta: dict[str, object] = {
        "provider": provider,
        "deployment": model.deployment,
        "deadlineMs": cases[0].spec.deadline_ms if cases else None,
        "loadAverageStart": load_start,
        "loadAverageEnd": load_end,
    }
    lines = [*summary.splitlines(), *narrative_share(results).splitlines()]
    if json_path is not None:
        await _write(json_path, artifact.full(meta, runs, lines))
    if baseline_path is not None:
        compact = artifact.baseline(meta, runs, lines, counts(rejections))
        await _write(baseline_path, compact)
    return 1 if any(run.report.violations for run in runs) else 0


async def _write(path: Path, content: dict[str, object]) -> None:
    text = json.dumps(content, indent=1, ensure_ascii=False) + "\n"
    await asyncio.to_thread(path.write_text, text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MatchIQ agent evaluation")
    parser.add_argument("--provider", choices=PROVIDERS, default="mock")
    parser.add_argument("--deadline-ms", type=int, default=None, help="request deadline override")
    parser.add_argument("--cases", type=int, default=None, help="evenly spaced sample size")
    parser.add_argument("--case", action="append", default=[], help="also run this case by name")
    parser.add_argument("--verbose", action="store_true", help="print reasons and issues per case")
    parser.add_argument("--json", type=Path, default=None, help="write every result here")
    parser.add_argument("--baseline", type=Path, default=None, help="write the compact baseline")
    args = parser.parse_args()
    selected = select_cases(args.cases, args.deadline_ms, args.case)
    run = main(
        args.provider,
        selected,
        verbose=args.verbose,
        json_path=args.json,
        baseline_path=args.baseline,
    )
    sys.exit(asyncio.run(run))
