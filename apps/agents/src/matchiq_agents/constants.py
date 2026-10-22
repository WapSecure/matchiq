from typing import Final

SERVICE_NAME: Final = "matchiq-agents"
API_PREFIX: Final = "/api/v1"
HEALTH_PREFIX: Final = f"{API_PREFIX}/health"
SECRET_MIN_LENGTH: Final = 32
DEFAULT_PORT: Final = 8000
DEFAULT_APP_VERSION: Final = "0.0.0-dev"
FOUNDRY_CHECK: Final = "foundry"
PIPELINE_RUNS_PATH: Final = f"{API_PREFIX}/pipeline/runs"
DEFAULT_CIRCUIT_FAILURE_THRESHOLD: Final = 5
DEFAULT_CIRCUIT_RESET_MS: Final = 30_000
RETRY_BACKOFF_BASE_MS: Final = 100
PER_CALL_DEADLINE_SHARE: Final = 0.5
# Local inference is serial (Ollama runs one request at a time by default) and the batched
# Localization call is the longest; one call may use up to this share of a slow-lane deadline.
LOCAL_PER_CALL_DEADLINE_SHARE: Final = 0.75
# Consecutive timeouts before a local model's breaker opens (ADR-0011 addendum): one pipeline
# times out at most twice before its deadline is spent, so this is four pipelines in a row
# without a single answer.
LOCAL_CIRCUIT_TIMEOUT_THRESHOLD: Final = 8
DEADLINE_RESERVE_MS: Final = 50
MIN_MODEL_CALL_MS: Final = 200
WORKFLOW_GRACE_MS: Final = 1_000
PROBLEM_CONTENT_TYPE: Final = "application/problem+json"
PROBLEM_TYPE_PREFIX: Final = "urn:matchiq:problem:"
BEARER_PREFIX: Final = "Bearer "
DEFAULT_OLLAMA_ENDPOINT: Final = "http://localhost:11434/v1/"
DEFAULT_OLLAMA_MODEL: Final = "qwen2.5:7b-instruct"
OLLAMA_PLACEHOLDER_API_KEY: Final = "ollama"
OLLAMA_TAGS_PATH: Final = "/api/tags"
OLLAMA_PROBE_TIMEOUT_S: Final = 1.5
OLLAMA_CHECK: Final = "ollama"
