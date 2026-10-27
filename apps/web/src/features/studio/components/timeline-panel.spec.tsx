import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Roster } from '../lib/roster';
import { TimelinePanel } from './timeline-panel';

const timeline = vi.hoisted(() => ({
  events: [],
  hasOlder: true,
  loadOlder: vi.fn(),
  loading: false,
  error: new Error('network failed'),
}));

vi.mock('../hooks/use-timeline-events', () => ({
  useTimelineEvents: () => timeline,
}));

vi.mock('../hooks/use-ticker-rows', () => ({ useTickerRows: () => [] }));
vi.mock('@/features/player-focus/use-followed-rows', () => ({
  useFollowedRows: () => [],
}));
vi.mock('../store', () => ({
  useMatchStore: <T,>(
    select: (state: { fixtureId: string; voided: Record<string, string> }) => T,
  ) => select({ fixtureId: 'fx_1', voided: {} }),
}));

describe('TimelinePanel recovery', () => {
  it('offers to retry when earlier events could not load', async () => {
    const user = userEvent.setup();
    render(
      <TimelinePanel roster={{ player: () => null } as unknown as Roster} />,
    );

    expect(screen.getByText(/couldn't load earlier events/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(timeline.loadOlder).toHaveBeenCalledOnce();
  });
});
