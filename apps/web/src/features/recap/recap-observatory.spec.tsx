import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObservatoryView } from '@/features/observatory/observatory-view';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { createQueryClient } from '@/lib/api/query-provider';
import { fixture } from '@/test/factories';
import { recap, run, status, trace } from '@/test/session-factories';
import { callsTo, stubApi } from '@/test/stub-api';
import { RecapView } from './recap-view';

const NOT_READY = {
  status: 404,
  body: {
    type: 'urn:matchiq:problem:recap-not-ready',
    title: 'The recap is available once the match has ended',
    status: 404,
  },
};

const renderWith = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );

describe('recap', () => {
  beforeEach(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS }));
  afterEach(() => vi.unstubAllGlobals());

  it('says the recap arrives at full time before the match ends', async () => {
    stubApi({ 'GET /recap': NOT_READY });
    renderWith(<RecapView fixture={fixture()} />);
    expect(
      await screen.findByText('Recap available at full time'),
    ).toBeInTheDocument();
  });

  it('renders the result, moments and metrics in the chosen locale', async () => {
    const user = userEvent.setup();
    stubApi({ 'GET /recap': { body: recap() } });
    renderWith(<RecapView fixture={fixture()} />);
    expect(
      await screen.findByRole('region', { name: 'Home United 3, Away City 2' }),
    ).toBeInTheDocument();
    const moments = screen.getByRole('list', { name: 'Key moments' });
    expect(moments).toHaveTextContent("76'");
    expect(moments).toHaveTextContent('Home United level it');
    const metrics = screen.getByRole('region', {
      name: 'Final metrics',
    }).textContent;
    await user.click(screen.getByRole('radio', { name: /Français/ }));
    expect(moments).toHaveTextContent('Home United égalise');
    await user.click(screen.getByRole('radio', { name: /Español/ }));
    expect(moments).toHaveTextContent('es-ES variant unavailable');
    await user.click(screen.getByRole('radio', { name: 'Casual' }));
    expect(moments).toHaveTextContent('No narrative for this audience');
    expect(
      screen.getByRole('region', { name: 'Final metrics' }).textContent,
    ).toBe(metrics);
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeEnabled();
  });
});

describe('agent observatory', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows publication, gate report and honest provider badges', async () => {
    stubApi({
      'GET /recap': NOT_READY,
      'GET /agent-runs': {
        body: {
          items: [
            trace(),
            trace({
              insightId: 'in_2',
              kind: 'GOAL',
              status: 'PUBLISHED',
              publication: 'AGENT',
              fallbackReason: null,
              gate: {
                source: 'AGENT',
                publishedNarratives: 12,
                templateNarratives: 1,
                overlayRevision: 2,
                rejected: [
                  {
                    item: 'NARRATIVE',
                    source: 'AGENT',
                    persona: 'CASUAL',
                    locale: 'fr-FR',
                    codes: ['UNSUPPORTED_NUMBER'],
                    details: ['"9" is not a cited value'],
                  },
                ],
              },
              runs: [
                run({
                  runId: 'run_2',
                  provider: 'mock',
                  outcome: 'SUCCEEDED',
                  latencyMs: 1_240,
                }),
                run({
                  runId: 'run_3',
                  agent: 'FACT_CHECKER',
                  provider: 'foundry',
                  modelDeployment: 'gpt-4o-mini',
                  outcome: 'SUCCEEDED',
                  retries: 1,
                }),
              ],
            }),
          ],
        },
      },
    });
    renderWith(<ObservatoryView fixture={fixture()} />);
    const list = await screen.findByRole('list', { name: 'Insight traces' });
    const [first, second] = within(list).getAllByRole('article');
    expect(first).toHaveTextContent('Published by: Template');
    expect(first).toHaveTextContent('AI_ENABLED=false');
    expect(first).toHaveTextContent('Nothing rejected.');
    expect(second).toHaveTextContent('Published by: Agent');
    expect(second).toHaveTextContent('UNSUPPORTED_NUMBER');
    expect(second).toHaveTextContent('Overlay revision 2');
    expect(second).toHaveTextContent('gpt-4o-mini');
    expect(second).toHaveTextContent('1,240 ms');
    expect(
      within(second).getByText('Mock').closest('[data-provider]'),
    ).toHaveTextContent('not a language model');
    expect(
      screen.getByText('Gate rejections').nextElementSibling,
    ).toHaveTextContent('1');
    expect(document.querySelectorAll('dd [data-provider]')).toHaveLength(3);
  });

  it('does not request the recap before full time', async () => {
    const api = stubApi({
      'GET /replay': { body: status({ state: 'PLAYING' }) },
      'GET /recap': NOT_READY,
      'GET /agent-runs': { body: { items: [trace()] } },
    });
    renderWith(<ObservatoryView fixture={fixture()} />);
    await screen.findByRole('list', { name: 'Insight traces' });
    expect(callsTo(api, '/replay').length).toBeGreaterThan(0);
    expect(callsTo(api, '/recap')).toHaveLength(0);
  });

  it('fetches the recap once the replay has completed', async () => {
    const api = stubApi({
      'GET /replay': { body: status({ state: 'COMPLETED' }) },
      'GET /recap': { body: recap() },
      'GET /agent-runs': { body: { items: [trace()] } },
    });
    renderWith(<ObservatoryView fixture={fixture()} />);
    await screen.findByRole('list', { name: 'Insight traces' });
    await vi.waitFor(() => expect(callsTo(api, '/recap')).toHaveLength(1));
  });
});
