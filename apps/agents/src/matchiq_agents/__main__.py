import uvicorn

from matchiq_agents.app import create_app
from matchiq_agents.settings import Settings


def main() -> None:
    settings = Settings()  # pyright: ignore[reportCallIssue]
    uvicorn.run(create_app(settings), host="0.0.0.0", port=settings.agents_port)  # noqa: S104


if __name__ == "__main__":
    main()
