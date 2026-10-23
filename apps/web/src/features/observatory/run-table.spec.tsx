import { render, screen, within } from '@testing-library/react';
import { run } from '@/test/session-factories';
import { RunTable } from './run-table';

describe('RunTable', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders every step of a run, including a retried agent', () => {
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const runs = [
      run({
        agent: 'MATCH_ANALYST',
        provider: 'ollama',
        outcome: 'TIMED_OUT',
        startedAt: '2026-10-21T17:19:26.000Z',
      }),
      run({
        agent: 'MATCH_ANALYST',
        provider: 'template',
        outcome: 'FALLBACK',
        startedAt: '2026-10-21T17:19:31.000Z',
      }),
      run({ agent: 'NARRATIVE_WRITER', startedAt: '2026-10-21T17:19:32.000Z' }),
    ];

    render(<RunTable runs={runs} caption="Runs" />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(runs.length + 1);
    expect(screen.getAllByRole('rowheader', { name: 'Analyst' })).toHaveLength(
      2,
    );
    expect(rows[1]).toHaveTextContent('Took too long');
    expect(rows[2]).toHaveTextContent('Standard wording (no AI)');
    const keyWarnings = errors.mock.calls.filter((args) =>
      args.some((a) => String(a).includes('same key')),
    );
    expect(keyWarnings).toEqual([]);
  });
});
