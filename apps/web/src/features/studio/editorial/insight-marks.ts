import { CORRECTION_COPY } from '@/constants/corrections';
import { EDITORIAL_COPY } from '@/constants/editorial';
import type { InsightTrace } from '@/lib/api/trace-schemas';

export type InsightMark = {
  /** Badges, most important first. */
  labels: string[];
  suppressed: boolean;
  /** A correction ruled the moment out; its cue and write-ups are withdrawn. */
  retracted: boolean;
  retractedReason: string | null;
  /** Narratives are out, so suppress no longer applies (409 otherwise). */
  published: boolean;
};

const NO_MARK: InsightMark = {
  labels: [],
  suppressed: false,
  retracted: false,
  retractedReason: null,
  published: false,
};

const heldLabel = (reason: string | null): string =>
  (reason ? EDITORIAL_COPY.marks.held[reason] : undefined) ??
  EDITORIAL_COPY.marks.heldFallback;

type Editorial = InsightTrace['editorial'];
type Local = { suppressed: boolean; ruledOut: string | undefined };

/** The correction reason when a correction ruled the moment out, else undefined. */
const ruledOutReason = (
  editorial: Editorial,
  local: Local,
): string | null | undefined => {
  if (local.ruledOut !== undefined) return local.ruledOut;
  return editorial?.insight === 'RETRACTED'
    ? editorial.insightReason
    : undefined;
};

const labelsOf = (
  editorial: Editorial,
  state: { retracted: boolean; suppressed: boolean },
): string[] => {
  const labels: string[] = [];
  if (state.retracted) labels.push(CORRECTION_COPY.badge);
  if (state.suppressed) labels.push(EDITORIAL_COPY.marks.suppressed);
  if (editorial?.overlay === 'HELD')
    labels.push(heldLabel(editorial.overlayReason));
  if (editorial?.overlay === 'RETRACTED' && !state.retracted)
    labels.push(EDITORIAL_COPY.marks.retracted);
  return labels;
};

const markOf = (trace: InsightTrace | undefined, local: Local): InsightMark => {
  const editorial = trace?.editorial;
  const reason = ruledOutReason(editorial, local);
  const retracted = reason !== undefined;
  const suppressed =
    !retracted && (local.suppressed || editorial?.insight === 'SUPPRESSED');
  const published =
    trace !== undefined && trace.publication !== 'PENDING' && !suppressed;
  return {
    labels: labelsOf(editorial, { retracted, suppressed }),
    suppressed,
    retracted,
    retractedReason: reason ?? null,
    published,
  };
};

/**
 * Editorial state per insight from the observatory read model, plus this
 * producer's confirmed suppressions and the stream's correction retractions
 * that the read model has not caught up with.
 */
export const insightMarks = (
  traces: readonly InsightTrace[] | undefined,
  suppressed: Readonly<Record<string, true>>,
  ruledOut: Readonly<Record<string, string>> = {},
): ((insightId: string) => InsightMark) => {
  const byId = new Map((traces ?? []).map((t) => [t.insightId, t]));
  return (insightId) => {
    const trace = byId.get(insightId);
    const local = {
      suppressed: suppressed[insightId] === true,
      ruledOut: ruledOut[insightId],
    };
    return trace || local.suppressed || local.ruledOut !== undefined
      ? markOf(trace, local)
      : NO_MARK;
  };
};
