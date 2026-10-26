import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { EVIDENCE_COPY } from '@/constants/evidence';
import { createQueryClient } from '@/lib/api/query-provider';
import { FX, insight, message, shot } from '@/test/factories';
import { buildRoster } from '../lib/roster';
import {
  createMatchStore,
  MatchStoreProvider,
  STUDIO_UI_DEFAULTS,
  useStudioUi,
} from '../store';
import { EvidenceDrawer } from './evidence-drawer';

const setup = () => {
  const store = createMatchStore(FX);
  act(() => {
    store
      .getState()
      .applyMessages([
        message('match.event', shot(3, 300_000), 1),
        message('match.event', shot(4, 420_000), 2),
        message('insight.detected', insight(), 3),
      ]);
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <MatchStoreProvider fixtureId={FX} store={store}>
        {children}
      </MatchStoreProvider>
    </QueryClientProvider>
  );
  return render(<EvidenceDrawer roster={buildRoster(undefined)} />, {
    wrapper,
  });
};

beforeEach(() => useStudioUi.setState(STUDIO_UI_DEFAULTS));

describe('evidence drawer', () => {
  it('stays closed until a moment is chosen', () => {
    setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the chosen moment and lists the plays that triggered it', () => {
    setup();
    act(() => useStudioUi.getState().openEvidence('in_1'));

    const dialog = screen.getByRole('dialog');
    const section = within(dialog)
      .getByRole('heading', { name: EVIDENCE_COPY.sections.events })
      .closest('section');
    expect(section).not.toBeNull();
    const plays = within(section as HTMLElement).getAllByRole('listitem');
    expect(plays).toHaveLength(2);
    for (const play of plays) expect(play).toHaveTextContent('Shot');
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    setup();
    act(() => useStudioUi.getState().openEvidence('in_1'));
    await user.click(screen.getByRole('button', { name: EVIDENCE_COPY.close }));
    expect(useStudioUi.getState().selectedInsightId).toBeNull();
  });
});
