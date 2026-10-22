from contextvars import ContextVar

from opentelemetry import trace

request_id: ContextVar[str | None] = ContextVar("request_id", default=None)
correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def log_context() -> dict[str, str]:
    """Ids of the current request plus the active span, for every log line."""
    fields: dict[str, str] = {}
    if (rid := request_id.get()) is not None:
        fields["requestId"] = rid
    if (cid := correlation_id.get()) is not None:
        fields["correlationId"] = cid
    span = trace.get_current_span().get_span_context()
    if span.is_valid:
        fields["traceId"] = trace.format_trace_id(span.trace_id)
        fields["spanId"] = trace.format_span_id(span.span_id)
    return fields
