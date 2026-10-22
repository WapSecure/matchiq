import io
import json
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from matchiq_agents.telemetry import (
    RequestContextMiddleware,
    TelemetrySettings,
    configure_tracing,
)
from matchiq_agents.telemetry.constants import ACCESS_LOGGER, REDACTED
from matchiq_agents.telemetry.logging import JsonFormatter, PrettyFormatter
from matchiq_agents.telemetry.redaction import redact, scrub_text
from matchiq_agents.telemetry.settings import LogFormat

TRACE_ID = "0af7651916cd43dd8448eb211c80319c"
TRACEPARENT = f"00-{TRACE_ID}-b7ad6b7169203331-01"


@pytest.fixture
def telemetry() -> TelemetrySettings:
    return TelemetrySettings(app_env="test", app_version="1.2.3")


def probe_app() -> FastAPI:
    app = FastAPI()

    @app.get("/api/v1/pipeline/{run_id}")
    def run(run_id: str) -> dict[str, str]:
        logging.getLogger(ACCESS_LOGGER).info("inside", extra={"runId": run_id})
        return {"runId": run_id}

    app.add_middleware(RequestContextMiddleware)
    return app


@pytest.mark.parametrize(
    "key",
    ["authorization", "Cookie", "AGENTS_SERVICE_TOKEN", "apiKey", "password", "ticket"],
)
def test_masks_secret_named_fields(key: str) -> None:
    assert redact({key: "leak", "nested": {key: "leak"}}) == {
        key: REDACTED,
        "nested": {key: REDACTED},
    }


def test_keeps_token_counts() -> None:
    assert redact({"tokensIn": 3, "tokensOut": 4}) == {"tokensIn": 3, "tokensOut": 4}


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Bearer abc.def rejected", f"Bearer {REDACTED} rejected"),
        ("postgresql://u:pw@db/x", f"postgresql://{REDACTED}@db/x"),
        ("InstrumentationKey=abc;X=1", f"InstrumentationKey={REDACTED};X=1"),
    ],
)
def test_scrubs_credentials_from_text(text: str, expected: str) -> None:
    assert scrub_text(text) == expected


def test_json_line_carries_service_fields_and_redacts(telemetry: TelemetrySettings) -> None:
    record = logging.LogRecord("matchiq_agents.x", logging.WARNING, "", 1, "Bearer t0k", None, None)
    record.authorization = "Bearer t0k"
    line = json.loads(JsonFormatter(telemetry).format(record))
    assert line["level"] == "warning"
    assert line["service"] == "matchiq-agents"
    assert line["version"] == "1.2.3"
    assert line["context"] == "matchiq_agents.x"
    assert line["msg"] == f"Bearer {REDACTED}"
    assert line["authorization"] == REDACTED


def test_pretty_line_is_readable(telemetry: TelemetrySettings) -> None:
    record = logging.LogRecord("svc", logging.INFO, "", 1, "hello", None, None)
    text = PrettyFormatter(telemetry).format(record)
    assert "INFO  [svc] hello" in text
    assert "matchiq-agents" not in text


def test_format_defaults_to_pretty_locally_only() -> None:
    assert TelemetrySettings(app_env="local").resolved_format is LogFormat.PRETTY
    assert TelemetrySettings(app_env="prod").resolved_format is LogFormat.JSON
    assert TelemetrySettings(app_env="local", log_format=LogFormat.JSON).resolved_format is (
        LogFormat.JSON
    )


def test_access_line_uses_route_template(telemetry: TelemetrySettings) -> None:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter(telemetry))
    logger = logging.getLogger(ACCESS_LOGGER)
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    try:
        client = TestClient(probe_app())
        response = client.get(
            "/api/v1/pipeline/run_secret",
            headers={"x-request-id": "req-abcdef12", "x-correlation-id": "corr-abcdef12"},
        )
        generated = client.get("/api/v1/pipeline/run_2", headers={"x-request-id": "bad id"})
    finally:
        logger.removeHandler(handler)
    records = [json.loads(line) for line in stream.getvalue().splitlines()]
    inside, access = records[0], records[1]
    assert response.headers["x-request-id"] == "req-abcdef12"
    assert inside["requestId"] == "req-abcdef12"
    assert inside["correlationId"] == "corr-abcdef12"
    assert access["route"] == "/api/v1/pipeline/{run_id}"
    assert access["status"] == 200
    assert "run_secret" not in json.dumps(access)
    assert generated.headers["x-request-id"] != "bad id"
    assert records[3]["correlationId"] == generated.headers["x-request-id"]


def test_tracing_stays_off_without_an_endpoint(telemetry: TelemetrySettings) -> None:
    app = FastAPI()
    assert configure_tracing(app, telemetry) is False
    assert not hasattr(app.state, "tracer_provider")


def test_tracing_honours_sdk_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    settings = TelemetrySettings(otel_exporter_otlp_endpoint="http://127.0.0.1:4318")  # pyright: ignore[reportArgumentType]
    assert configure_tracing(FastAPI(), settings) is False


def test_worker_traceparent_parents_the_request_span(telemetry: TelemetrySettings) -> None:
    exporter = InMemorySpanExporter()
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter(telemetry))
    logger = logging.getLogger(ACCESS_LOGGER)
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    try:
        app = probe_app()
        assert configure_tracing(app, telemetry, exporter=exporter) is True
        with TestClient(app) as client:
            client.get("/api/v1/pipeline/run_3", headers={"traceparent": TRACEPARENT})
    finally:
        logger.removeHandler(handler)
    spans = exporter.get_finished_spans()
    assert spans
    assert all(span.context is not None for span in spans)
    assert {f"{span.context.trace_id:032x}" for span in spans if span.context} == {TRACE_ID}
    inside = json.loads(stream.getvalue().splitlines()[0])
    assert inside["traceId"] == TRACE_ID
