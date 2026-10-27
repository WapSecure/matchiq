import type { AgentStep, AgentStepTrace } from '@matchiq/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { useSession } from '@/lib/auth/session-store';
import { run, trace } from '@/test/session-factories';
import { callsTo, stubApi } from '@/test/stub-api';
import { HowWritten } from './how-written';

const CORRELATION = '29f9b4b3-d721-8eb6-9911-25ef49b3355c';
const RUNS = '/fixtures/fx_test/agent-runs';
const STEPS = `/agents/traces/${CORRELATION}`;

const step = (overrides: Partial<AgentStep> = {}): AgentStep => ({
  stepIndex: 0,
  role: 'MATCH_ANALYST',
  runId: 'run_1',
  correlationId: CORRELATION,
  agentVersion: { promptVersion: '2.0.0' },
  provider: 'foundry',
  fromStatus: 'DETECTED',
  toStatus: 'ANALYZED',
  decision: 'PASS',
  reasonCode: 'GROUNDED',
  reason: 'grounded',
  inputChecksum: 'b'.repeat(64),
  evidenceEventIds: [],
  metricRefs: [],
  startedAt: '2026-10-21T17:19:26.747Z',
  latencyMs: 1_200,
  retries: 0,
  ...overrides,
});

const stepsBody = (steps: AgentStep[]): AgentStepTrace => ({
  correlationId: CORRELATION,
  runId: 'run_1',
  fixtureId: 'fx_test',
  insightId: 'in_1',
  steps,
});

const FULL = [
  step(),
  step({ role: 'NARRATIVE_WRITER', reasonCode: 'DRAFTED', latencyMs: 2_400 }),
  step({ role: 'FACT_CHECKER', reasonCode: 'VERIFIED', latencyMs: 800 }),
  step({ role: 'LOCALIZATION', reasonCode: 'LOCALISED', latencyMs: 3_000 }),
];

const agentTrace = (extra: Partial<ReturnType<typeof trace>> = {}) =>
  trace({
    publication: 'AGENT',
    status: 'PUBLISHED',
    fallbackReason: null,
    gate: {
      source: 'AGENT',
      publishedNarratives: 12,
      templateNarratives: 0,
      overlayRevision: 1,
      rejected: [],
    },
    runs: [
      run({
        agent: 'NARRATIVE_WRITER',
        provider: 'foundry',
        outcome: 'SUCCEEDED',
      }),
    ],
    ...extra,
  });

const renderIt = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <HowWritten fixtureId="fx_test" insightId="in_1" moment="Goal 18'" />
    </QueryClientProvider>,
  );

const open = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: 'How this was written' }),
  );
};

afterEach(() => useSession.setState({ view: null }));

describe('HowWritten', () => {
  it('is collapsed and requests nothing until opened', () => {
    const api = stubApi({
      [`GET ${RUNS}`]: { body: { items: [agentTrace()] } },
    });
    renderIt();
    expect(
      screen.getByRole('button', { name: 'How this was written' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(callsTo(api, RUNS)).toHaveLength(0);
  });

  it('shows the chain with outcomes, durations and the final line', async () => {
    stubApi({
      [`GET ${RUNS}`]: { body: { items: [agentTrace()] } },
      [`GET ${STEPS}`]: { body: stepsBody(FULL) },
    });
    renderIt();
    await open();
    const chain = await screen.findByRole('list', {
      name: "Steps behind Goal 18'",
    });
    const items = within(chain).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'AnalystPassedTook 2s',
      'WriterPassedTook 3s',
      'Fact checkerPassedTook 1s',
      'Publish gatePassed',
    ]);
    expect(screen.getByText(/Translator: Passed · 3s/)).toBeInTheDocument();
    expect(
      screen.getByText('Written by a model and fact-checked'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Caught/)).not.toBeInTheDocument();
  });

  it.each([
    [24_000, true],
    [1_500, false],
    [undefined, false],
  ])('queue wait %s shows the quiet line: %s', async (queueWaitMs, shown) => {
    stubApi({
      [`GET ${RUNS}`]: {
        body: {
          items: [agentTrace(queueWaitMs === undefined ? {} : { queueWaitMs })],
        },
      },
      [`GET ${STEPS}`]: { body: stepsBody(FULL) },
    });
    renderIt();
    await open();
    await screen.findByRole('list', { name: "Steps behind Goal 18'" });
    const line = screen.queryByText(
      'Waited 24 s in the queue before writing started',
    );
    expect(line !== null).toBe(shown);
    expect(screen.queryAllByText(/^Step time/).length > 0).toBe(shown);
    expect(screen.queryAllByText(/^Took/).length > 0).toBe(!shown);
  });

  it('lists what the fact check caught', async () => {
    const caught = agentTrace({
      gate: {
        source: 'AGENT',
        publishedNarratives: 12,
        templateNarratives: 0,
        overlayRevision: 1,
        rejected: [
          {
            item: 'NARRATIVE',
            source: 'AGENT',
            persona: 'CASUAL',
            locale: 'en-GB',
            codes: ['UNSUPPORTED_NUMBER'],
            details: [],
          },
        ],
      },
    });
    stubApi({
      [`GET ${RUNS}`]: { body: { items: [caught] } },
      [`GET ${STEPS}`]: { body: stepsBody(FULL) },
    });
    renderIt();
    await open();
    expect(await screen.findByText('Caught 1 problem')).toBeInTheDocument();
    expect(
      screen.getByText(/A number that doesn't match the match data/),
    ).toBeInTheDocument();
  });

  it('shows only the plain reason for a template-only moment', async () => {
    stubApi({
      [`GET ${RUNS}`]: { body: { items: [trace()] } },
      [`GET ${STEPS}`]: {
        status: 404,
        body: { title: 'Not Found', status: 404 },
      },
    });
    renderIt();
    await open();
    expect(
      await screen.findByText(
        'Standard wording: AI writing is switched off here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Steps behind/ })).toBeNull();
    expect(screen.queryByText(/No agent steps/)).toBeNull();
  });

  it('says so when an auto-written moment has no recorded steps', async () => {
    stubApi({
      [`GET ${RUNS}`]: { body: { items: [agentTrace()] } },
      [`GET ${STEPS}`]: { body: stepsBody([]) },
    });
    renderIt();
    await open();
    expect(
      await screen.findByText('No agent steps were recorded for this moment.'),
    ).toBeInTheDocument();
  });

  it('shows a plain error and recovers on retry', async () => {
    let fail = true;
    stubApi({
      [`GET ${RUNS}`]: () =>
        fail
          ? {
              status: 400,
              body: { title: 'Bad Request', status: 400 },
            }
          : { body: { items: [trace()] } },
    });
    renderIt();
    await open();
    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent(/400|bad request|status/i);
    fail = false;
    await userEvent.click(within(alert).getByRole('button'));
    expect(await screen.findByText(/Standard wording:/)).toBeInTheDocument();
  });

  it('is hidden from viewers who cannot read agent traces', () => {
    useSession.setState({
      view: {
        status: 'authenticated',
        user: { roles: ['viewer'] },
        permissions: ['fixtures:read', 'insights:read'],
      } as never,
    });
    stubApi({});
    renderIt();
    expect(
      screen.queryByRole('button', { name: 'How this was written' }),
    ).toBeNull();
  });

  it('uses no technical words', async () => {
    stubApi({
      [`GET ${RUNS}`]: { body: { items: [agentTrace()] } },
      [`GET ${STEPS}`]: { body: stepsBody(FULL) },
    });
    const { container } = renderIt();
    await open();
    await waitFor(() => screen.getByText(/Written by a model/));
    expect(container.textContent).not.toMatch(
      /correlation|checksum|token|prompt|SHA|json|gate:|\bAI\b/i,
    );
  });
});
