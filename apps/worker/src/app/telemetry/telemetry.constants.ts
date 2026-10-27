/** The worker's Prometheus series (catalogue in docs/operations/OBSERVABILITY.md). */
export const WORKER_METRICS = {
  names: {
    agentRuns: 'matchiq_agent_runs_total',
    agentRunSeconds: 'matchiq_agent_run_duration_seconds',
    pipelineCalls: 'matchiq_agent_pipeline_call_duration_seconds',
    completions: 'matchiq_insight_completions_total',
    gateRejections: 'matchiq_gate_rejections_total',
    transactions: 'matchiq_pipeline_commit_duration_seconds',
    jobs: 'matchiq_queue_job_duration_seconds',
    retention: 'matchiq_retention_deleted_total',
    sessions: 'matchiq_replay_sessions',
    queueJobs: 'matchiq_queue_jobs',
    queueWait: 'matchiq_agent_queue_wait_seconds',
    queueDepth: 'matchiq_agent_queue_depth',
    outboxBacklog: 'matchiq_outbox_backlog',
    outboxAge: 'matchiq_outbox_oldest_age_seconds',
  },
  help: {
    agentRuns:
      'Agent runs stored with a publication, by agent, provider and outcome (FALLBACK and TIMED_OUT included)',
    agentRunSeconds:
      'Agent run latency reported by each run, by agent, provider and outcome',
    pipelineCalls:
      'Worker-side agents pipeline calls by outcome (count is the _count series)',
    completions: 'Insights completed, by pipeline status and narrative source',
    gateRejections:
      'Items the deterministic publish gate rejected, by item, source and issue code',
    transactions:
      'Committed pipeline transactions (events, snapshot, insights, cues) latency',
    jobs: 'BullMQ job processing time by queue and outcome',
    retention: 'Rows deleted by data retention, by kind',
    sessions: 'Replay sessions loaded in this worker by state',
    queueJobs: 'BullMQ jobs by queue and state',
    queueWait:
      'Time an insight-pipeline job waited in the queue before its first attempt began',
    queueDepth: 'Insight-pipeline jobs waiting for the agents service',
    outboxBacklog: 'Unpublished outbox rows',
    outboxAge: 'Age of the oldest unpublished outbox row (relay lag)',
  },
  buckets: {
    agent: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120],
    write: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  },
  queueStates: ['waiting', 'active', 'delayed', 'failed'] as const,
} as const;
