import type { GateRejection } from '@/lib/api/trace-schemas';
import { STYLE_ISSUE_CODES } from '@/constants/gate-reasons';

/** A rejection is about wording only when every code is a style check. */
export const isStyleOnly = (r: GateRejection): boolean =>
  r.codes.length > 0 && r.codes.every((c) => STYLE_ISSUE_CODES.has(c));

/** Facts and numbers stopped before air, apart from wording held back for style. */
export const splitRejections = (rejected: readonly GateRejection[]) => ({
  caught: rejected.filter((r) => !isStyleOnly(r)),
  heldBack: rejected.filter(isStyleOnly),
});
