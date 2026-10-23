import os
from typing import TYPE_CHECKING

from fastapi import FastAPI

from matchiq_agents.telemetry.constants import (
    ATTRIBUTES,
    SDK_DISABLED_ENV,
    TRACES_PATH,
    TRACING_EXCLUDED_URLS,
)
from matchiq_agents.telemetry.settings import TelemetrySettings

if TYPE_CHECKING:
    from opentelemetry.sdk.trace.export import SpanExporter


def configure_tracing(
    app: FastAPI, settings: TelemetrySettings, *, exporter: "SpanExporter | None" = None
) -> bool:
    """
    Instruments the app when an OTLP endpoint is set (or a test passes an
    exporter). Incoming W3C `traceparent` from the worker becomes the parent
    of the request span. Otherwise the SDK is never imported. Returns whether
    tracing is on.
    """
    if os.environ.get(SDK_DISABLED_ENV) == "true":
        return False
    endpoint = settings.otel_exporter_otlp_endpoint
    if endpoint is None and exporter is None:
        return False
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor

    provider = TracerProvider(
        resource=Resource.create(
            {
                ATTRIBUTES["service_name"]: settings.otel_service_name,
                ATTRIBUTES["service_version"]: settings.app_version,
                ATTRIBUTES["environment"]: settings.app_env,
            }
        )
    )
    if exporter is not None:
        provider.add_span_processor(SimpleSpanProcessor(exporter))
    else:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        url = str(endpoint).rstrip("/") + TRACES_PATH
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=url)))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(  # pyright: ignore[reportUnknownMemberType]
        app, tracer_provider=provider, excluded_urls=TRACING_EXCLUDED_URLS
    )
    app.state.tracer_provider = provider
    return True
