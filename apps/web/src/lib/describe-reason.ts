import {
  AUDIT_REASON_LABELS,
  REASON_CODE_PATTERN,
  REASON_COPY,
  REASON_SEPARATORS,
} from '@/constants/audit-reasons';

const sentenceCase = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** Turns any stored code into spaced, sentence-case words. */
export function humaniseCode(code: string): string {
  return sentenceCase(
    code.replace(REASON_SEPARATORS, ' ').trim().toLowerCase(),
  );
}

/** Producer wording for a stored reason; raw codes never reach the screen. */
export function describeReason(raw: string | null | undefined): string {
  const text = raw?.trim();
  if (!text) return REASON_COPY.none;
  const known = AUDIT_REASON_LABELS[text];
  if (known) return known;
  if (!text.includes(' ') && text.toUpperCase() === text) {
    return humaniseCode(text);
  }
  return text.replace(REASON_CODE_PATTERN, (code) =>
    (AUDIT_REASON_LABELS[code] ?? humaniseCode(code)).toLowerCase(),
  );
}

/** Unknown action keys such as `overlay.awaiting-approval` are humanised. */
export function describeAction(
  action: string,
  labels: Readonly<Record<string, string>>,
): string {
  return labels[action] ?? humaniseCode(action);
}
