const API = 'http://localhost:3000/api/v1';
const TEMPLATE_ID = 'fx_comeback_42';
const REQUEST_TIMEOUT_MS = 5_000;
const REPLAY_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_000;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${url} returned ${response.status}`,
    );
  }
  return response;
}

async function readJson(url, options) {
  return request(url, options).then((response) => response.json());
}

async function waitFor(label, operation) {
  const deadline = Date.now() + REPLAY_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `${label} did not complete within ${REPLAY_TIMEOUT_MS / 1_000}s${lastError ? `: ${lastError.message}` : ''}`,
  );
}

const apiHealth = await readJson(`${API}/health/ready`);
if (apiHealth.status !== 'ok') throw new Error('API is not ready');

const workerHealth = await readJson('http://worker:3001/api/v1/health/ready');
if (workerHealth.status !== 'ok') throw new Error('Worker is not ready');

const agentsHealth = await readJson('http://agents:8000/api/v1/health/ready');
if (!['ok', 'degraded'].includes(agentsHealth.status)) {
  throw new Error('Agents service is not ready');
}

await request('http://web:4200/');

const templates = await readJson(`${API}/fixture-templates`);
const template = templates.items?.find(
  (item) => item.templateId === TEMPLATE_ID,
);
if (!template || template.eventCount < 1) {
  throw new Error(`Seeded fixture ${TEMPLATE_ID} is missing or empty`);
}

const created = await readJson(`${API}/fixtures/${TEMPLATE_ID}/sessions`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'idempotency-key': `compose-smoke-${Date.now()}`,
  },
  body: JSON.stringify({ speed: 30 }),
});
const sessionId = created.session?.sessionId;
if (!sessionId) throw new Error('Replay session response has no sessionId');

const replay = await waitFor('replay progress', async () => {
  const status = await readJson(`${API}/fixtures/${sessionId}/replay`);
  return status.appliedSequence >= 0 &&
    ['PLAYING', 'COMPLETED'].includes(status.state)
    ? status
    : undefined;
});

const events = await waitFor('persisted replay events', async () => {
  const page = await readJson(
    `${API}/fixtures/${sessionId}/events?afterSequence=-1&limit=10`,
  );
  return page.items?.length > 0 ? page : undefined;
});

console.log(
  JSON.stringify({
    result: 'passed',
    services: {
      api: apiHealth.status,
      worker: workerHealth.status,
      agents: agentsHealth.status,
      web: 'ok',
    },
    seededFixture: {
      templateId: template.templateId,
      eventCount: template.eventCount,
    },
    replay: {
      sessionId,
      state: replay.state,
      appliedSequence: replay.appliedSequence,
      persistedEventsObserved: events.items.length,
    },
  }),
);
