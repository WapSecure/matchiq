import json
import logging
import sys
from datetime import UTC, datetime

from matchiq_agents.telemetry.constants import NOISY_LOGGERS, STANDARD_RECORD_FIELDS
from matchiq_agents.telemetry.context import log_context
from matchiq_agents.telemetry.redaction import redact, scrub_text
from matchiq_agents.telemetry.settings import LogFormat, TelemetrySettings


def _extras(record: logging.LogRecord) -> dict[str, object]:
    return {k: v for k, v in record.__dict__.items() if k not in STANDARD_RECORD_FIELDS}


class JsonFormatter(logging.Formatter):
    """One JSON object per line, with the fields the Node services emit."""

    def __init__(self, settings: TelemetrySettings) -> None:
        super().__init__()
        self._base = {
            "service": settings.otel_service_name,
            "version": settings.app_version,
            "env": settings.app_env,
        }

    def format(self, record: logging.LogRecord) -> str:
        line: dict[str, object] = {
            "level": record.levelname.lower(),
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            **self._base,
            "context": record.name,
            **log_context(),
            **_extras(record),
            "msg": scrub_text(record.getMessage()),
        }
        if record.exc_info:
            line["stack"] = scrub_text(self.formatException(record.exc_info))
        return json.dumps(redact(line), default=str)


class PrettyFormatter(JsonFormatter):
    """Readable local-development lines; same fields, minus the service boilerplate."""

    def format(self, record: logging.LogRecord) -> str:
        line: dict[str, object] = json.loads(super().format(record))
        head = f"{str(line.pop('time'))[11:23]} {str(line.pop('level')).upper():<5}"
        message = line.pop("msg")
        context = line.pop("context")
        for key in self._base:
            line.pop(key, None)
        extra = f" {json.dumps(line)}" if line else ""
        return f"{head} [{context}] {message}{extra}"


def configure_logging(settings: TelemetrySettings) -> None:
    """Routes the root logger (uvicorn included) to stdout in the configured format."""
    handler = logging.StreamHandler(sys.stdout)
    pretty = settings.resolved_format is LogFormat.PRETTY
    handler.setFormatter(PrettyFormatter(settings) if pretty else JsonFormatter(settings))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
    for name in NOISY_LOGGERS:
        # The request-context middleware writes the access line instead.
        logging.getLogger(name).disabled = True
