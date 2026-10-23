import type { Locale } from '@matchiq/contracts';
import {
  causalityFindings,
  claimFindings,
  mentionsEvent,
  phraseRepeats,
  recentRepeat,
  toneFindings,
  type GuardFinding,
  type PublishedText,
} from '@matchiq/narrative-guard';
import type { GateIssueCode } from '@matchiq/db';
import { GATE_DETAILS } from '../../constants';
import { GUARD_EXCERPT_MAX, UNQUOTED_TONE_REASONS } from './gate.constants';
import { extractNumerals, represents } from './text-checks';

export interface GuardIssue {
  readonly code: GateIssueCode;
  readonly detail: string;
}

export interface GuardInput {
  readonly headline: string;
  readonly body: string;
  readonly locale: Locale;
  readonly supported: readonly number[];
  /** Names and terms that may appear in capitals. */
  readonly allowed: ReadonlySet<string>;
}

const excerptOf = (finding: GuardFinding): string | null => {
  if (UNQUOTED_TONE_REASONS.has(finding.reason)) return null;
  const text = finding.excerpt.trim();
  return text.length > GUARD_EXCERPT_MAX
    ? `${text.slice(0, GUARD_EXCERPT_MAX)}…`
    : text;
};

const toIssue = (finding: GuardFinding): GuardIssue => ({
  code: finding.rule,
  detail: GATE_DETAILS.guard(finding.reason, excerptOf(finding)),
});

/** A causal sentence is grounded when it states a cited value or names a recorded event. */
const groundedIn =
  (locale: Locale, supported: readonly number[]) => (sentence: string) =>
    mentionsEvent(sentence, locale) ||
    extractNumerals(sentence, locale).some((n) =>
      supported.some((value) => represents(n, value)),
    );

/**
 * The checks the agents service also runs, repeated here so the worker gate
 * stays authoritative on its own (spec §10, §46): forbidden claims, injection
 * echoes, unsupported causality, repeated phrases and broadcast tone.
 */
export const guardIssues = (input: GuardInput): GuardIssue[] => {
  const fields = [input.headline, input.body];
  const text = fields.join('\n');
  return [
    ...claimFindings(text),
    ...causalityFindings(
      text,
      input.locale,
      groundedIn(input.locale, input.supported),
    ),
    ...phraseRepeats(fields),
    ...toneFindings(fields, input.allowed),
  ].map(toIssue);
};

/** A draft that repeats a narrative recently published for the same variant. */
export const repeatIssues = (
  draft: PublishedText,
  recent: readonly PublishedText[],
): GuardIssue[] => {
  const repeat = recentRepeat(draft, recent);
  return repeat === null ? [] : [toIssue(repeat)];
};
