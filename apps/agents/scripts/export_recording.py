"""Exports a recorded model run from a local MatchIQ database (ADR-0042). Read-only.

    uv run python scripts/export_recording.py --session fx_comeback_42_s7 \
        --out src/matchiq_agents/providers/recordings/fx_comeback_42.json

Runs only SELECT statements through `docker exec <container> psql`. What the agents service
returned for each moment is rebuilt from the tables the worker wrote: the agent narratives
(`narratives`), the overlay copy (`overlay_cues`) and the runs (`agent_runs`). Tenant ids,
insight ids, narrative ids and timestamps are left out. Cited values were not stored, so they are
rebuilt from the narrative text and the moment's engine metrics; the live checks then judge them.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from matchiq_agents.contracts.types import Locale
from matchiq_agents.guard.text import extract_numerals
from matchiq_agents.providers.recording import Recording, template_id_of

CANONICAL = "en-GB"
FORMAT_VERSION = 1
SQL = {
    "fixture": "select payload from fixtures where fixture_id = '{s}'",
    "insights": "select insight_id, kind, period, match_clock_ms, fallback_reason, payload "
    "from insights where fixture_id = '{s}' order by detected_sequence",
    "narratives": "select distinct on (insight_id, persona, locale) insight_id, source, payload "
    "from narratives where fixture_id = '{s}' and retracted_at is null "
    "order by insight_id, persona, locale, revision desc",
    "overlays": "select distinct on (insight_id) insight_id, payload from overlay_cues "
    "where fixture_id = '{s}' order by insight_id, revision desc",
    "runs": "select insight_id, agent, provider, outcome, latency_ms, payload, created_at "
    "from agent_runs where fixture_id = '{s}' order by created_at, id",
}
PRODUCER_FAILED = "producer: overlay failed checks"
# The worker publishes these as templates and never sends them to the agents (ADR-0011 add. 7).
TEMPLATE_ONLY_KINDS = frozenset({"PLAYER_MILESTONE"})


def query(container: str, sql: str) -> list[dict[str, Any]]:
    wrapped = f"select coalesce(json_agg(t), '[]'::json) from ({sql}) t"  # noqa: S608
    result = subprocess.run(  # noqa: S603
        [  # noqa: S607
            "docker",
            "exec",
            container,
            "psql",
            "-U",
            "matchiq",
            "-d",
            "matchiq",
            "-At",
            "-c",
            wrapped,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def cited_values(
    text: str, metrics: dict[str, float], preferred: list[str]
) -> list[dict[str, Any]]:
    """One metric per distinct number in the text: the overlay's metrics first, then by name."""
    order = [ref for ref in preferred if ref in metrics] + sorted(
        ref for ref in metrics if ref not in preferred
    )
    chosen: dict[str, float] = {}
    for numeral in extract_numerals(text, Locale.en_GB):
        if not numeral.raw[0].isdigit():
            continue
        ref = next((r for r in order if numeral.represents(metrics[r])), None)
        if ref is not None:
            chosen[ref] = metrics[ref]
    return [{"metricRef": ref, "value": value} for ref, value in chosen.items()]


def narrative(
    row: dict[str, Any], metrics: dict[str, float], preferred: list[str]
) -> dict[str, Any]:
    body = row["payload"]
    canonical = body["locale"] == CANONICAL
    return {
        "persona": body["persona"],
        "locale": body["locale"],
        "headline": body["headline"],
        "body": body["body"],
        "evidenceEventIds": body["citations"],
        "citedValues": cited_values(f"{body['headline']}\n{body['body']}", metrics, preferred)
        if canonical
        else [],
        "localeFallback": body["localeFallback"],
    }


def run(row: dict[str, Any]) -> dict[str, Any]:
    body = row["payload"]
    out: dict[str, Any] = {
        "agent": row["agent"],
        "provider": row["provider"],
        "outcome": row["outcome"],
        "latencyMs": row["latency_ms"],
        "retries": body["retries"],
        "promptVersion": body["promptVersion"],
    }
    for source, target in (
        ("promptHash", "promptHash"),
        ("tokensIn", "tokensIn"),
        ("tokensOut", "tokensOut"),
    ):
        if source in body:
            out[target] = body[source]
    if body.get("repairs"):
        out["repairs"] = body["repairs"]
    return out


def moment(
    insight: dict[str, Any], home: str, template: str, data: dict[str, list[dict[str, Any]]]
) -> dict[str, Any]:
    body, iid = insight["payload"], insight["insight_id"]
    metrics = body["evidence"]["computedMetrics"]
    overlay_row = next((r for r in data["overlays"] if r["insight_id"] == iid), None)
    producer_ok = PRODUCER_FAILED not in (insight["fallback_reason"] or "")
    overlay = overlay_row["payload"] if overlay_row and producer_ok else None
    preferred: list[str] = overlay["metricRefs"] if overlay else []
    team = body.get("teamId")
    return {
        "key": {
            "templateId": template,
            "kind": insight["kind"],
            "period": insight["period"],
            "matchClockMs": insight["match_clock_ms"],
            "side": "none" if team is None else ("home" if team == home else "away"),
            "reasonCode": body["reasonCode"],
        },
        "narratives": [
            narrative(r, metrics, preferred)
            for r in data["narratives"]
            if r["insight_id"] == iid and r["source"] == "AGENT"
        ],
        "overlay": None
        if overlay is None
        else {
            "headline": overlay["headline"],
            "body": overlay["body"],
            "metricRefs": overlay["metricRefs"],
        },
        "runs": [
            run(r) for r in data["runs"] if r["insight_id"] == iid and r["provider"] == "ollama"
        ],
    }


def session_moments(container: str, session: str) -> list[dict[str, Any]]:
    data = {name: query(container, sql.format(s=session)) for name, sql in SQL.items()}
    home = query(container, SQL["fixture"].format(s=session))[0]["payload"]["home"]["teamId"]
    template = template_id_of(session)
    ran = [r for r in data["runs"] if r["provider"] == "ollama"]
    models = {r["payload"]["modelDeployment"].removeprefix("ollama/") for r in ran}
    if len(models) != 1:
        raise SystemExit(f"{session} was written by {sorted(models)}; expected exactly one model")
    source = {
        "session": session,
        "model": models.pop(),
        "recordedOn": min(r["created_at"][:10] for r in ran),
    }
    moments = [{**moment(i, home, template, data), "source": source} for i in data["insights"]]
    return [m for m in moments if m["narratives"] and m["key"]["kind"] not in TEMPLATE_ONLY_KINDS]


def build(container: str, sessions: list[str]) -> dict[str, Any]:
    """Earlier sessions win: a later one only fills moments the earlier ones did not record."""
    merged: dict[str, dict[str, Any]] = {}
    for session in sessions:
        for found in session_moments(container, session):
            merged.setdefault(json.dumps(found["key"], sort_keys=True), found)
    moments = sorted(
        merged.values(),
        key=lambda m: (m["key"]["period"], m["key"]["matchClockMs"], m["key"]["kind"]),
    )
    return {
        "formatVersion": FORMAT_VERSION,
        "templateId": template_id_of(sessions[0]),
        "exportedWith": "apps/agents/scripts/export_recording.py",
        "note": "Real output of local model runs, replayed through the live checks. "
        "No model runs when this is used.",
        "moments": moments,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--session", required=True, action="append", dest="sessions")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--container", default="matchiq-postgres-1")
    args = parser.parse_args()
    document = build(args.container, args.sessions)
    Recording.model_validate(document)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(document, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(document['moments'])} moments, {args.out.stat().st_size} bytes -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
