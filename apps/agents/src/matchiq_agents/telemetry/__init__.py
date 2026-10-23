"""Structured logs and optional OpenTelemetry tracing (ADR-0019)."""

from matchiq_agents.telemetry.logging import configure_logging
from matchiq_agents.telemetry.middleware import RequestContextMiddleware
from matchiq_agents.telemetry.settings import TelemetrySettings
from matchiq_agents.telemetry.tracing import configure_tracing

__all__ = [
    "RequestContextMiddleware",
    "TelemetrySettings",
    "configure_logging",
    "configure_tracing",
]
