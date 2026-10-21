"""Runs the golden + adversarial evaluation against a chosen model provider and prints a summary.

Usage (from apps/agents):
    uv run python scripts/run_eval.py --provider mock
    MODEL_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b-instruct uv run python scripts/run_eval.py \
        --provider ollama
    FOUNDRY_PROJECT_ENDPOINT=... FOUNDRY_MODEL=... uv run python scripts/run_eval.py \
        --provider foundry

Never part of CI: ollama and foundry make real model calls. Exit code 1 if any case leaks an
unsupported claim.
"""

import argparse
import asyncio
import os
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.eval.cases import ADVERSARIAL_INPUTS, GOLDEN, EvalCase
from tests.eval.harness import CaseReport, evaluate
from tests.support.builders import build_request

from matchiq_agents.clock import SystemClock
from matchiq_agents.contracts.types import PipelineResult
from matchiq_agents.pipeline.orchestrator import PipelineOrchestrator
from matchiq_agents.settings import Settings
from matchiq_agents.wiring import build_orchestrator

PROVIDERS = ("mock", "ollama", "foundry")
PLACEHOLDER_TOKEN = "eval-" + "x" * 32
ROW = "{:<32} {:<9} {:<15} {:>5} {:>5} {:>5} {:>7} {:>8} {:>7}"
HEADER = ROW.format("case", "status", "sources", "unsup", "unkn", "leak", "locFb", "ms", "tokens")


def _settings(provider: str) -> Settings:
    os.environ["MODEL_PROVIDER"] = provider
    os.environ.setdefault("AGENTS_SERVICE_TOKEN", PLACEHOLDER_TOKEN)
    return Settings()  # pyright: ignore[reportCallIssue]


def _tokens(result: PipelineResult) -> int:
    return sum((run.tokensIn or 0) + (run.tokensOut or 0) for run in result.runs)


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
        len(report.unsupported_numbers),
        len(report.unknown_entities),
        len(report.injection_leaks),
        report.locale_fallbacks,
        round(elapsed_ms),
        _tokens(result),
    )


def _summary(reports: list[CaseReport], latencies: list[float], outcomes: Counter[str]) -> str:
    ordered = sorted(latencies)
    p95 = ordered[max(0, round(0.95 * len(ordered)) - 1)]
    statuses = Counter(report.status for report in reports)
    return "\n".join(
        [
            f"cases={len(reports)} violations={sum(r.violations for r in reports)}",
            f"statuses={dict(statuses)}",
            f"agent_run_outcomes={dict(outcomes)}",
            f"latency_ms p50={ordered[len(ordered) // 2]:.0f} p95={p95:.0f}",
        ]
    )


async def main(provider: str) -> int:
    settings = _settings(provider)
    orchestrator = build_orchestrator(settings, SystemClock())
    print(f"provider={provider} deployment={orchestrator.model.deployment or '-'}")
    print(HEADER)
    reports: list[CaseReport] = []
    latencies: list[float] = []
    outcomes: Counter[str] = Counter()
    for case in (*GOLDEN, *ADVERSARIAL_INPUTS):
        report, elapsed_ms, result = await _run_case(orchestrator, case)
        reports.append(report)
        latencies.append(elapsed_ms)
        outcomes.update(f"{run.provider.value}:{run.outcome.value}" for run in result.runs)
        print(_row(report, elapsed_ms, result), flush=True)
    print(_summary(reports, latencies, outcomes))
    return 1 if any(report.violations for report in reports) else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MatchIQ agent evaluation")
    parser.add_argument("--provider", choices=PROVIDERS, default="mock")
    sys.exit(asyncio.run(main(parser.parse_args().provider)))
