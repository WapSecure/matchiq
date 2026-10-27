import type { AgentStep, AgentStepTrace } from '@matchiq/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '@/lib/api/query-provider';
import { run, trace } from '@/test/session-factories';
import { callsTo, stubApi } from '@/test/stub-api';
import { AgentStepTable } from './agent-step-table';
import { AgentStepTimeline } from './agent-step-timeline';

const CORRELATION = '29f9b4b3-d721-8eb6-9911-25ef49b3355c';
const PATH = `/agents/traces/${CORRELATION}`;

const step = (overrides: Partial<AgentStep> = {}): AgentStep => ({
  stepIndex: 0,
  role: 'MATCH_ANALYST',
  runId: 'run_1',
  correlationId: CORRELATION,
  agentVersion: { promptVersion: '2.0.0', promptHash: 'a'.repeat(64) },
  provider: 'foundry',
  modelDeployment: 'gpt-test',
  fromStatus: 'DETECTED',
  toStatus: 'ANALYZED',
  decision: 'PASS',
  reasonCode: 'GROUNDED',
  reason: 'analysis grounded in the evidence',
  inputChecksum: 'b'.repeat(64),
  evidenceEventIds: ['ev_1', 'ev_2'],
  metricRefs: ['shots.home.rolling5m'],
  startedAt: '2026-10-21T17:19:26.747Z',
  latencyMs: 1_200,
  tokensIn: 410,
  tokensOut: 120,
  retries: 0,
  ...overrides,
});

const ROSTER: Partial<AgentStep>[] = [
  {},
  { role: 'NARRATIVE_WRITER', reasonCode: 'DRAFTED' },
  {
    role: 'FACT_CHECKER',
    decision: 'REVISE',
    reasonCode: 'REVISION_REQUESTED',
  },
  { role: 'LOCALIZATION', reasonCode: 'LOCALISED' },
  {
    role: 'BROADCAST_PRODUCER',
    decision: 'FALLBACK',
    reasonCode: 'BUDGET_EXCEEDED',
  },
];

const body = (steps: AgentStep[]): AgentStepTrace => ({
  correlationId: CORRELATION,
  runId: 'run_1',
  fixtureId: 'fx_1',
  insightId: 'in_1',
  steps,
});

const published = trace({
  publication: 'AGENT',
  runs: [run({ correlationId: CORRELATION })],
});

const renderWith = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );

describe('AgentStepTimeline', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('walks every handoff in plain words, with time taken and evidence', async () => {
    const steps = ROSTER.map((o, i) => step({ ...o, stepIndex: i }));
    stubApi({ [`GET ${PATH}`]: { body: body(steps) } });
    renderWith(<AgentStepTimeline trace={published} moment="Shot burst 10'" />);

    const list = await screen.findByRole('list', {
      name: "Agent handoffs for Shot burst 10'",
    });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Every point it made is backed');
    expect(items[0]).toHaveTextContent('Took 2s');
    expect(items[0]).toHaveTextContent('Used 2 match events and 1 statistic');
    expect(items[2]).toHaveTextContent('Sent back');
    expect(items[4]).toHaveTextContent('Reached the spending limit');
    expect(list).not.toHaveTextContent('gpt-test');
    expect(list).not.toHaveTextContent('aaaaaaaaaaaa');
  });

  it('pages a long run of handoffs', async () => {
    const steps = Array.from({ length: 9 }, (_, i) => step({ stepIndex: i }));
    stubApi({ [`GET ${PATH}`]: { body: body(steps) } });
    renderWith(<AgentStepTimeline trace={published} moment="m" />);

    const list = await screen.findByRole('list', { name: /handoffs for m/ });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(9);
  });

  it('shows an empty state when the run stored no handoffs', async () => {
    stubApi({});
    renderWith(<AgentStepTimeline trace={published} moment="m" />);
    expect(
      await screen.findByText('No handoffs were recorded for this moment.'),
    ).toBeInTheDocument();
  });

  it('treats a 204 from the proxy as no handoffs', async () => {
    stubApi({ [`GET ${PATH}`]: { status: 204, body: null } });
    renderWith(<AgentStepTimeline trace={published} moment="m" />);
    expect(
      await screen.findByText('No handoffs were recorded for this moment.'),
    ).toBeInTheDocument();
  });

  it('waits for a moment that is still being written', () => {
    const mock = stubApi({});
    renderWith(
      <AgentStepTimeline
        trace={trace({ publication: 'PENDING' })}
        moment="m"
      />,
    );
    expect(
      screen.getByText('The agents are still working on this moment.'),
    ).toBeInTheDocument();
    expect(callsTo(mock, PATH)).toHaveLength(0);
  });

  it('shows a loading state, then a plain error with a retry', async () => {
    stubApi({ [`GET ${PATH}`]: { status: 503, body: {} } });
    renderWith(<AgentStepTimeline trace={published} moment="m" />);
    expect(
      screen.getByRole('status', {
        name: 'Loading how the agents worked on this',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "We couldn't load how the agents worked on this",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('503')).not.toBeInTheDocument();
  });

  it('keeps model, version, hash and tokens in the technical table', async () => {
    stubApi({ [`GET ${PATH}`]: { body: body([step()]) } });
    renderWith(<AgentStepTable trace={published} caption="Records" />);
    const table = await screen.findByRole('table');
    expect(table).toHaveTextContent('gpt-test');
    expect(table).toHaveTextContent('v2.0.0');
    expect(table).toHaveTextContent('aaaaaaaaaaaa');
    expect(table).toHaveTextContent('410 / 120');
    expect(table).toHaveTextContent('DETECTED → ANALYZED');
  });
});
