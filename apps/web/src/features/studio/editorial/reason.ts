import { EditorialReason, LIMITS } from '@matchiq/contracts';
import { EDITORIAL_COPY } from '@/constants/editorial';

export const REASON_MIN = LIMITS.editorialReasonMin;
export const REASON_MAX = LIMITS.editorialReasonMax;

/** Same rule as the API contract (trimmed, 3–280); null when valid. */
export const reasonError = (reason: string): string | null => {
  if (EditorialReason.safeParse(reason).success) return null;
  return reason.trim().length < REASON_MIN
    ? EDITORIAL_COPY.reason.tooShort(REASON_MIN)
    : EDITORIAL_COPY.reason.tooLong(REASON_MAX);
};
