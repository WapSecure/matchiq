import { render, screen } from '@testing-library/react';
import { INITIAL_CONNECTION, type ConnectionState } from '@/lib/stream';
import { FX } from '@/test/factories';
import { createMatchStore, MatchStoreProvider } from '../store';
import { ConnectionBanner } from './connection-banner';

const TECHNICAL_WORDS = /\b(sse|stream|socket|http|error|timeout|\d{3})\b/i;

const renderBanner = (state: ConnectionState) => {
  const store = createMatchStore(FX);
  store.getState().setConnection({ ...INITIAL_CONNECTION, state });
  return render(
    <MatchStoreProvider fixtureId={FX} store={store}>
      <ConnectionBanner />
    </MatchStoreProvider>,
  );
};

describe('ConnectionBanner', () => {
  it.each([
    [
      'reconnecting',
      'Reconnecting… The score and stats will catch up by themselves.',
    ],
    [
      'stale',
      'Updates are slow to arrive, so figures may be a few seconds behind. No action needed.',
    ],
    [
      'offline',
      "You're offline. Showing the last known score and stats. We'll pick up again when you're back.",
    ],
  ] as const)(
    'says what is happening in plain words when %s',
    (state, text) => {
      renderBanner(state);
      const banner = screen.getByRole('status');
      expect(banner).toHaveTextContent(text);
      expect(banner.textContent).not.toMatch(TECHNICAL_WORDS);
    },
  );

  it.each(['connecting', 'live'] as const)(
    'stays out of the way while %s',
    (state) => {
      renderBanner(state);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );
});
