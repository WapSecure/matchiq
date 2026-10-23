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
      await screen.findByText('The recap is ready at full time'),
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
      name: 'Final stats',
    }).textContent;
    await user.click(screen.getByRole('radio', { name: /Français/ }));
    expect(moments).toHaveTextContent('Home United égalise');
    await user.click(screen.getByRole('radio', { name: /Español/ }));
    expect(moments).toHaveTextContent(
      "The Spanish version isn't ready yet, so you're seeing English.",
    );
    await user.click(screen.getByRole('radio', { name: 'Fan' }));
    expect(moments).toHaveTextContent('No write-up for this audience');
    expect(
      screen.getByRole('region', { name: 'Final stats' }).textContent,
    ).toBe(metrics);
    await user.click(
      screen.getByRole('button', { name: 'Download match report' }),
    );
    expect(
      screen.getByRole('menuitem', { name: /Match report/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Data file/ }),
    ).toHaveTextContent('.json');
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
    const list = await screen.findByRole('list', {
      name: 'Key moments and their checks',
    });
    const [first, second] = within(list).getAllByRole('article');
    expect(first).toHaveTextContent('Standard wording');
    const facts = (article: HTMLElement) =>
      [
        ...within(article)
          .getByTestId('trace-story')
          .querySelectorAll(':scope > div'),
      ].map((d) => d.textContent);
    expect(facts(first)).toEqual([
      'CommentaryStandard wording',
      'GraphicStandard wording',
      'Fact checkPassed ✓',
      expect.stringMatching(/^Ready in4 languages for 3 audiences: /),
    ]);
    expect(first).toHaveTextContent(
      'Why standard wording: AI writing is switched off here.',
    );
    expect(screen.getByTestId('fallback-note')).toHaveTextContent(
      '1 moment used standard wording because AI writing is switched off here.',
    );
    expect(within(first).getByTestId('technical-details')).toHaveTextContent(
      'AI_ENABLED=false',
    );
    expect(first).toHaveTextContent('Nothing rejected.');
    expect(facts(second)).toEqual([
      'CommentaryAI-written',
      'GraphicAI-written',
      'Fact checkCaught 1 problem',
      expect.stringMatching(/^Ready in4 languages for 3 audiences: /),
    ]);
    expect(
      within(second).getByRole('button', {
        name: /English, French, Spanish and Nigerian Pidgin, for fans, analysts and broadcast/,
      }),
    ).toBeInTheDocument();
    expect(second).toHaveTextContent(
      "Write-up for fans in French: A number that doesn't match the match data",
    );
    expect(within(second).getByTestId('technical-details')).toHaveTextContent(
      'UNSUPPORTED_NUMBER',
    );
    expect(second).toHaveTextContent('Overlay revision 2');
    expect(second).toHaveTextContent('gpt-4o-mini');
    expect(second).toHaveTextContent('1,240 ms');
    expect(
      within(second)
        .getByText('Test stand-in (not real AI)')
        .closest('[data-provider]'),
    ).toHaveTextContent('not a language model');
    expect(
      screen.getByText('Caught by the fact check').nextElementSibling,
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
    await screen.findByRole('list', { name: 'Key moments and their checks' });
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
    await screen.findByRole('list', { name: 'Key moments and their checks' });
    await vi.waitFor(() => expect(callsTo(api, '/recap')).toHaveLength(1));
  });
});
