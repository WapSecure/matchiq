import type {
  EditorialControl,
  EditorialMode,
  EditorialStatus,
} from '@matchiq/contracts';
import type { MatchData } from './types';

export type StatusSource = 'stream' | 'rest';

export const INACTIVE_CONTROL: EditorialControl = {
  active: false,
  changedAt: null,
};

const stamp = (control: EditorialControl): number =>
  control.changedAt ? Date.parse(control.changedAt) : 0;

const latestChange = (status: EditorialStatus): number =>
  Math.max(stamp(status.freeze), stamp(status.killSwitch));

/** The kill switch outranks a session freeze (ADR-0016). */
export const modeOf = (
  freeze: EditorialControl,
  killSwitch: EditorialControl,
): EditorialMode => {
  if (killSwitch.active) return 'KILLED';
  return freeze.active ? 'FROZEN' : 'AUTO';
};

/**
 * Stream frames arrive in order and always apply. A REST read or a command
 * result may race the stream, so it applies only when it is not older.
 */
export const reduceEditorial = (
  state: Pick<MatchData, 'editorial'>,
  status: EditorialStatus,
  source: StatusSource = 'stream',
): Partial<MatchData> => {
  const current = state.editorial;
  if (
    source === 'rest' &&
    current !== null &&
    latestChange(status) < latestChange(current)
  ) {
    return {};
  }
  return { editorial: status };
};

/** Folds an organisation kill-switch result into this fixture's status. */
export const withKillSwitch = (
  state: Pick<MatchData, 'editorial' | 'fixtureId'>,
  killSwitch: EditorialControl,
): EditorialStatus => {
  const freeze = state.editorial?.freeze ?? INACTIVE_CONTROL;
  return {
    fixtureId: state.fixtureId,
    freeze,
    killSwitch,
    mode: modeOf(freeze, killSwitch),
  };
};
