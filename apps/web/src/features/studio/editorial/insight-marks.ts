import { EDITORIAL_COPY } from '@/constants/editorial';
import type { InsightTrace } from '@/lib/api/trace-schemas';

export type InsightMark = {
  /** Badges, most important first. */
  labels: string[];
  suppressed: boolean;
  /** Narratives are out, so suppress no longer applies (409 otherwise). */
  published: boolean;
};

const NO_MARK: InsightMark = {
  labels: [],
  suppressed: false,
  published: false,
};

const heldLabel = (reason: string | null): string =>
  (reason ? EDITORIAL_COPY.marks.held[reason] : undefined) ??
  EDITORIAL_COPY.marks.heldFallback;

const markOf = (
  trace: InsightTrace | undefined,
  local: boolean,
): InsightMark => {
  const editorial = trace?.editorial;
  const suppressed = local || editorial?.insight === 'SUPPRESSED';
  const labels: string[] = [];
  if (suppressed) labels.push(EDITORIAL_COPY.marks.suppressed);
  if (editorial?.overlay === 'HELD')
    labels.push(heldLabel(editorial.overlayReason));
  if (editorial?.overlay === 'RETRACTED')
    labels.push(EDITORIAL_COPY.marks.retracted);
  const published =
    trace !== undefined && trace.publication !== 'PENDING' && !suppressed;
  return { labels, suppressed, published };
};

/**
 * Editorial state per insight from the observatory read model, plus this
 * producer's confirmed suppressions that the read model has not caught up with.
 */
export const insightMarks = (
  traces: readonly InsightTrace[] | undefined,
  suppressed: Readonly<Record<string, true>>,
): ((insightId: string) => InsightMark) => {
  const byId = new Map((traces ?? []).map((t) => [t.insightId, t]));
  return (insightId) => {
    const trace = byId.get(insightId);
    const local = suppressed[insightId] === true;
    return trace || local ? markOf(trace, local) : NO_MARK;
  };
};
