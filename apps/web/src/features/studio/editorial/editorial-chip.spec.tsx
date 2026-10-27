import type {
  EditorialMode,
  EditorialStatus,
  PublishPolicy,
} from '@matchiq/contracts';
import { render, screen } from '@testing-library/react';
import { FX } from '@/test/factories';
import { createMatchStore, MatchStoreProvider } from '../store';
import { EditorialChip } from './editorial-status';

const AT = '2026-10-24T14:05:00.000Z';
const status = (
  mode: EditorialMode,
  policy: PublishPolicy,
): EditorialStatus => ({
  fixtureId: FX,
  mode,
  freeze: {
    active: mode === 'FROZEN',
    changedAt: mode === 'FROZEN' ? AT : null,
  },
  killSwitch: { active: false, changedAt: null },
  publishPolicy: { policy, changedAt: AT },
});

const chip = (mode: EditorialMode, policy: PublishPolicy) => {
  const store = createMatchStore(FX);
  store.getState().applyEditorial(status(mode, policy), 'rest');
  render(
    <MatchStoreProvider fixtureId={FX} store={store}>
      <EditorialChip />
    </MatchStoreProvider>,
  );
  return screen.getByTestId('editorial-chip');
};

describe('EditorialChip', () => {
  it('reads Auto graphics when nothing is held and approval is automatic', () => {
    expect(chip('AUTO', 'AUTO')).toHaveTextContent('Auto graphics');
  });

  it('reads Manual approval when a producer approves each graphic', () => {
    expect(chip('AUTO', 'MANUAL')).toHaveTextContent('Manual approval');
  });

  it('keeps the pause state visible over the approval mode', () => {
    expect(chip('FROZEN', 'MANUAL')).toHaveTextContent('Graphics paused');
  });
});
