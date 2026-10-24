import { AUDIT_ACTIONS } from '@matchiq/contracts';
import { AUDIT_ACTION_LABELS } from '@/constants/audit';
import { AUDIT_REASON_LABELS } from '@/constants/audit-reasons';
import {
  describeAction,
  describeReason,
  humaniseCode,
} from './describe-reason';

const SHOUTING = /\b[A-Z0-9]+(?:_[A-Z0-9]+)+\b/;

describe('describeReason', () => {
  it('maps every known code to plain wording', () => {
    for (const [code, label] of Object.entries(AUDIT_REASON_LABELS)) {
      expect(describeReason(code)).toBe(label);
      expect(label).not.toMatch(SHOUTING);
    }
  });

  it('uses producer wording for the lapsed approval window', () => {
    expect(describeReason('APPROVAL_WINDOW_LAPSED')).toBe(
      'Not sent to air in time',
    );
    expect(describeReason('AWAITING_APPROVAL')).toBe(
      "Waiting for a producer's OK",
    );
  });

  it('humanises unknown codes', () => {
    expect(describeReason('SOME_NEW_REASON')).toBe('Some new reason');
    expect(describeReason('FEED_LAG_2')).toBe('Feed lag 2');
  });

  it('never returns an all-caps underscore string, even inside text', () => {
    for (const raw of ['X_Y', 'LOUD_CODE_9', 'Held: NEW_CODE here']) {
      expect(describeReason(raw)).not.toMatch(SHOUTING);
    }
  });

  it('keeps a producer-written reason as typed', () => {
    expect(describeReason('Wrong score shown on air')).toBe(
      'Wrong score shown on air',
    );
  });

  it('says no reason was recorded when blank', () => {
    for (const raw of [null, undefined, '', '  ']) {
      expect(describeReason(raw)).toBe('No reason recorded');
    }
  });
});

describe('describeAction', () => {
  it('labels every known action and humanises unknown ones', () => {
    for (const action of Object.values(AUDIT_ACTIONS)) {
      expect(AUDIT_ACTION_LABELS[action]).toBeDefined();
      expect(describeAction(action, AUDIT_ACTION_LABELS)).not.toBe(
        humaniseCode(action),
      );
    }
    expect(describeAction('overlay.new-thing', AUDIT_ACTION_LABELS)).toBe(
      'Overlay new thing',
    );
  });
});
