import uvicorn

from matchiq_agents.app import create_app
from matchiq_agents.settings import Settings
from matchiq_agents.telemetry import TelemetrySettings, configure_logging


def main() -> None:
    settings = Settings()  # pyright: ignore[reportCallIssue]
    telemetry = TelemetrySettings()
    configure_logging(telemetry)
    app = create_app(settings, telemetry=telemetry)
    # log_config=None keeps uvicorn on the JSON root handler configured above.
    uvicorn.run(app, host="0.0.0.0", port=settings.agents_port, log_config=None)  # noqa: S104


if __name__ == "__main__":
    main()
