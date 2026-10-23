import logging
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from matchiq_agents.telemetry import context
from matchiq_agents.telemetry.constants import (
    ACCESS_LOGGER,
    ACCESS_MESSAGE,
    CORRELATION_ID_HEADER,
    QUIET_ROUTE_PATTERN,
    REQUEST_ID_HEADER,
    REQUEST_ID_PATTERN,
    UNMATCHED_ROUTE,
)

logger = logging.getLogger(ACCESS_LOGGER)


def _header(scope: Scope, name: str) -> str | None:
    wanted = name.encode()
    for key, value in scope.get("headers", []):
        if key.lower() == wanted:
            text = value.decode("latin-1")
            return text if REQUEST_ID_PATTERN.match(text) else None
    return None


def _route(scope: Scope) -> str:
    route = scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) else UNMATCHED_ROUTE


class RequestContextMiddleware:
    """
    Accepts a well-formed `x-request-id` (or issues one) and echoes it, binds
    it and the caller's `x-correlation-id` to every log line of the request,
    and writes one access line with the route template, never the raw path.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = _header(scope, REQUEST_ID_HEADER) or str(uuid.uuid4())
        rid = context.request_id.set(request_id)
        cid = context.correlation_id.set(_header(scope, CORRELATION_ID_HEADER) or request_id)
        started = time.perf_counter()
        status = 500

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = int(message["status"])
                message.setdefault("headers", []).append(
                    (REQUEST_ID_HEADER.encode(), request_id.encode())
                )
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            self._log(scope, status, started)
            context.request_id.reset(rid)
            context.correlation_id.reset(cid)

    @staticmethod
    def _log(scope: Scope, status: int, started: float) -> None:
        route = _route(scope)
        fields = {
            "method": scope.get("method"),
            "route": route,
            "status": status,
            "durationMs": round((time.perf_counter() - started) * 1_000),
        }
        level = logging.DEBUG if QUIET_ROUTE_PATTERN.search(route) else logging.INFO
        logger.log(level, ACCESS_MESSAGE, extra=fields)
