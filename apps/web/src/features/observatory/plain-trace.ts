import type { GateRejection } from '@/lib/api/trace-schemas';
import { englishLanguageName, PERSONA_LABELS } from '@/constants/match';
import type { FallbackGroup } from '@/constants/fact-checks';
import {
  FALLBACK_REASON_COPY,
  FALLBACK_REASON_DEFAULT,
  FALLBACK_REASON_SEPARATOR,
  ISSUE_DEFAULT,
  ISSUE_LABELS,
  ITEM_LABELS,
} from '@/constants/observatory';
import { GUARD_ISSUE_LABELS } from '@/constants/gate-reasons';

type PlainReason = { text: string; group: FallbackGroup };

const plainReason = (part: string): PlainReason =>
  FALLBACK_REASON_COPY.find((c) => c.pattern.test(part)) ??
  FALLBACK_REASON_DEFAULT;

/** Machine fallback reasons as short plain sentences, without repeats. */
export const plainFallbackReasons = (raw: string | null): string[] => {
  if (!raw) return [];
  const sentences = raw
    .split(FALLBACK_REASON_SEPARATOR)
    .map((part) => plainReason(part).text);
  return [...new Set(sentences)];
};

/** The group a fallback is counted under on the page-level note. */
export const fallbackGroup = (raw: string | null): FallbackGroup =>
  raw
    ? plainReason(raw.split(FALLBACK_REASON_SEPARATOR)[0] ?? raw).group
    : FALLBACK_REASON_DEFAULT.group;

export const issueLabel = (code: string): string =>
  ISSUE_LABELS[code] ?? GUARD_ISSUE_LABELS[code] ?? ISSUE_DEFAULT;

/** "Write-up for Fans in Français: A number that doesn't match the match data". */
export const describeRejection = (r: GateRejection): string => {
  const subject = [
    ITEM_LABELS[r.item],
    r.persona ? `for ${PERSONA_LABELS[r.persona]}` : null,
    r.locale ? `in ${englishLanguageName(r.locale)}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const issues = [...new Set(r.codes.map(issueLabel))].join('; ');
  return `${subject}: ${issues || ISSUE_DEFAULT}`;
};
