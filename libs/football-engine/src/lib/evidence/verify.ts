import type { CitedValue, EvidenceEnvelope } from '@matchiq/contracts';

export type CitedValueIssueReason = 'UNKNOWN_METRIC' | 'VALUE_MISMATCH';

export interface CitedValueIssue {
  readonly metricRef: string;
  readonly value: number;
  readonly reason: CitedValueIssueReason;
  /** The envelope's value when the metric exists but differs. */
  readonly expected?: number;
}

/**
 * Cited values not supported by the envelope. Matching is exact (`===` on
 * the number): the engine already rounds, so a narrative must cite the
 * envelope value verbatim. An empty result means every citation is supported.
 */
export const verifyCitedValues = (
  envelope: Pick<EvidenceEnvelope, 'computedMetrics'>,
  citedValues: readonly CitedValue[],
): CitedValueIssue[] =>
  citedValues.flatMap((cited): CitedValueIssue[] => {
    if (!Object.hasOwn(envelope.computedMetrics, cited.metricRef)) {
      return [{ ...cited, reason: 'UNKNOWN_METRIC' }];
    }
    const expected = envelope.computedMetrics[cited.metricRef];
    if (expected === cited.value) return [];
    return [
      {
        ...cited,
        reason: 'VALUE_MISMATCH',
        ...(expected === undefined ? {} : { expected }),
      },
    ];
  });

/**
 * Event ids that are neither triggering evidence nor counter-evidence in the
 * envelope, in first-seen order without duplicates.
 */
export const verifyEvidenceIds = (
  envelope: Pick<EvidenceEnvelope, 'eventIds' | 'counterEvidence'>,
  eventIds: readonly string[],
): string[] => {
  const allowed = new Set([
    ...envelope.eventIds,
    ...envelope.counterEvidence.flatMap((c) => c.eventIds),
  ]);
  return [...new Set(eventIds.filter((id) => !allowed.has(id)))];
};
