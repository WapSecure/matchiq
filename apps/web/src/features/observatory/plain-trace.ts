import type { GateRejection } from '@/lib/api/trace-schemas';
import { englishLanguageName, PERSONA_LABELS } from '@/constants/match';
import {
  FALLBACK_REASON_COPY,
  FALLBACK_REASON_DEFAULT,
  FALLBACK_REASON_SEPARATOR,
  ISSUE_DEFAULT,
  ISSUE_LABELS,
  ITEM_LABELS,
  OBSERVATORY_COPY,
} from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';

const story = OBSERVATORY_COPY.story;

/** Machine fallback reasons as plain sentences, without repeats. */
export const plainFallbackReasons = (raw: string | null): string[] => {
  if (!raw) return [];
  const sentences = raw
    .split(FALLBACK_REASON_SEPARATOR)
    .map(
      (part) =>
        FALLBACK_REASON_COPY.find((c) => c.pattern.test(part))?.text ??
        FALLBACK_REASON_DEFAULT,
    );
  return [...new Set(sentences)];
};

export const issueLabel = (code: string): string =>
  ISSUE_LABELS[code] ?? ISSUE_DEFAULT;

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

const checkStep = (gate: InsightTrace['gate']): string => {
  if (!gate) return story.checkPending;
  return gate.rejected.length === 0
    ? story.checked
    : story.caught(gate.rejected.length);
};

const graphicStep = (trace: InsightTrace): string | null => {
  const editorial = trace.editorial?.overlay;
  if (editorial) return story.graphic[editorial];
  if (!trace.gate) return null;
  return trace.gate.overlayRevision === null
    ? story.graphic.standard
    : story.graphic.aiWording;
};

/** One line per key moment: spotted, written, checked, on air, versions. */
export const traceStory = (trace: InsightTrace, minute: string): string[] =>
  [
    story.spotted(minute),
    story.written[trace.publication],
    checkStep(trace.gate),
    graphicStep(trace),
    trace.gate ? story.versions(trace.gate.publishedNarratives) : null,
  ].filter((step): step is string => step !== null);
