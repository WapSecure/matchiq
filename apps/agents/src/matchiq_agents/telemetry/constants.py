import re
from typing import Final

REQUEST_ID_HEADER: Final = "x-request-id"
CORRELATION_ID_HEADER: Final = "x-correlation-id"
# Mirrors REQUEST_ID_PATTERN in libs/server-kit so ids flow unchanged between services.
REQUEST_ID_PATTERN: Final = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")

REDACTED: Final = "[REDACTED]"
REDACTION_MAX_DEPTH: Final = 6
# Mirrors REDACTED_KEY_PATTERN / REDACTED_TEXT_PATTERNS in libs/server-kit (tested on both sides).
REDACTED_KEY_PATTERN: Final = re.compile(
    r"authorization|cookie|passw(or)?d|pwd|secret|token(?!s?(in|out|count))|api[-_]?key"
    r"|credential|connection[-_]?string|private[-_]?key|ticket",
    re.IGNORECASE,
)
REDACTED_TEXT_PATTERNS: Final = (
    (re.compile(r"\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE), rf"\1 {REDACTED}"),
    (re.compile(r"\b([a-z][a-z0-9+.-]*://)[^\s/:@]+:[^\s/@]+@", re.IGNORECASE), rf"\1{REDACTED}@"),
    (
        re.compile(
            r"\b(InstrumentationKey|AccountKey|SharedAccessKey|Password|Pwd|token|ticket"
            r"|api[-_]?key)=([^;&\s]+)",
            re.IGNORECASE,
        ),
        rf"\1={REDACTED}",
    ),
)

ACCESS_LOGGER: Final = "matchiq_agents.http"
ACCESS_MESSAGE: Final = "request completed"
UNMATCHED_ROUTE: Final = "unmatched"
QUIET_ROUTE_PATTERN: Final = re.compile(r"/health(/|$)")

TRACES_PATH: Final = "/v1/traces"
SDK_DISABLED_ENV: Final = "OTEL_SDK_DISABLED"
TRACING_EXCLUDED_URLS: Final = "health"
ATTRIBUTES: Final = {
    "service_name": "service.name",
    "service_version": "service.version",
    "environment": "deployment.environment.name",
}

# LogRecord attributes that are not caller-supplied `extra` fields.
STANDARD_RECORD_FIELDS: Final = frozenset(
    {
        "args", "asctime", "created", "exc_info", "exc_text", "filename", "funcName",
        "levelname", "levelno", "lineno", "message", "module", "msecs", "msg", "name",
        "pathname", "process", "processName", "relativeCreated", "stack_info", "taskName",
        "thread", "threadName",
    }
)  # fmt: skip
NOISY_LOGGERS: Final = ("uvicorn.access",)
