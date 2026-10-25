from types import MappingProxyType
from typing import Final

from matchiq_agents.contracts.types import AgentName
from matchiq_agents.pipeline.budget import BudgetLimits

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
# Per-agent caps, as shares of the whole deadline (ADR-0011 addendum 2), ordered by what each
# stage contributes to air: the Writer produces every agent narrative, so it may use whatever is
# left; a slow Analyst is cut short, because its template analysis still feeds the Writer.
# Measured on a contended M1 Pro (about 10 tokens/s out, 30 tokens/s prefill): Analyst 22-52 s,
# Writer about 70 s.
LOCAL_AGENT_DEADLINE_SHARES: Final = MappingProxyType(
    {
        AgentName.MATCH_ANALYST: 0.25,
        AgentName.NARRATIVE_WRITER: 0.9,
        AgentName.LOCALIZATION: 0.75,
        AgentName.BROADCAST_PRODUCER: 0.2,
    }
)
LOCAL_FEEDBACK_RETRIES: Final = 1
# A feedback retry only starts while this share of the deadline is still left.
LOCAL_FEEDBACK_MIN_SHARE: Final = 0.6
# Consecutive timeouts before a local model's breaker opens (ADR-0011 addendum): one pipeline
# times out at most twice before its deadline is spent, so this is four pipelines in a row
# without a single answer.
LOCAL_CIRCUIT_TIMEOUT_THRESHOLD: Final = 8
# Per-run budget defaults (AGENT_BUDGET_*). A normal run takes at most 7 hops (analyst, two
# writer/checker rounds, localization, producer); the mock and local models report no cost.
DEFAULT_RUN_BUDGET: Final = BudgetLimits(max_hops=12, max_tokens=60_000, max_cost_usd=0.5)
BUDGET_HOPS_MAX: Final = 32
DEADLINE_RESERVE_MS: Final = 50
MIN_MODEL_CALL_MS: Final = 200
# Model work ends this long before `deadlineMs`, leaving room to cancel in-flight calls and
# render templates. Local inference gets more: cancelling a busy Ollama request was measured
# at up to 3.5 s on a loaded machine.
WORKFLOW_GRACE_MS: Final = 1_000
LOCAL_WORKFLOW_GRACE_MS: Final = 5_000
PROBLEM_CONTENT_TYPE: Final = "application/problem+json"
PROBLEM_TYPE_PREFIX: Final = "urn:matchiq:problem:"
BEARER_PREFIX: Final = "Bearer "
DEFAULT_OLLAMA_ENDPOINT: Final = "http://localhost:11434/v1/"
DEFAULT_OLLAMA_MODEL: Final = "qwen2.5:7b-instruct"
OLLAMA_PLACEHOLDER_API_KEY: Final = "ollama"
OLLAMA_TAGS_PATH: Final = "/api/tags"
OLLAMA_PROBE_TIMEOUT_S: Final = 1.5
OLLAMA_CHECK: Final = "ollama"
OLLAMA_GENERATE_PATH: Final = "/api/generate"
OLLAMA_WARMUP_TIMEOUT_S: Final = 240.0
DEFAULT_OLLAMA_KEEP_ALIVE: Final = "30m"
OLLAMA_KEEP_ALIVE_PATTERN: Final = r"^(-1|\d+[smh])$"

DEFAULT_RECORDED_LATENCY_MS: Final = 1500
RECORDED_CHECK: Final = "recorded"
RECORDED_DEPLOYMENT_PREFIX: Final = "recorded/"
RECORDING_FORMAT_VERSION: Final = 1
RECORDINGS_SUBDIR: Final = "recordings"
