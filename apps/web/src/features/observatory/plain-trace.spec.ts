import { describe, expect, it } from 'vitest';
import { GUARD_ISSUE_LABELS } from '@/constants/gate-reasons';
import { issueLabel } from './plain-trace';

describe('issueLabel', () => {
  it.each(Object.entries(GUARD_ISSUE_LABELS))(
    'explains the %s guard check in plain words',
    (code, label) => {
      expect(issueLabel(code)).toBe(label);
    },
  );
});
