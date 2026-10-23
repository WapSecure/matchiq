import type { Fixture, Locale, MetricValue, Persona } from '@matchiq/contracts';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { RECAP_COPY, REPORT_RULE } from '@/constants/recap';
import { statRows } from '@/features/studio/lib/stat-rows';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { formatMetric, formatMinute } from '@/lib/format';
import { pickNarrative } from './pick-narrative';
import { orderedMoments } from './recap-order';
import { recapTranslationNotice } from './recap-translation-notice';

const copy = RECAP_COPY.report;

type ReportOptions = {
  recap: RecapDocument;
  fixture: Fixture;
  persona: Persona;
  locale: Locale;
};

const statValue = (v: number | MetricValue): string =>
  typeof v === 'number' ? String(v) : (formatMetric(v) ?? copy.unavailable);

/** A plain-text match report: score, moments in the chosen audience and language, stats. */
export const buildReport = ({
  recap,
  fixture,
  persona,
  locale,
}: ReportOptions): string => {
  const { home, away } = recap.finalSnapshot.score;
  const moments = orderedMoments(recap.keyMoments).map((m) => {
    const picked = pickNarrative(m.narratives, persona, locale);
    const text = picked
      ? `${picked.narrative.headline}. ${picked.narrative.body}`
      : INSIGHT_KIND_LABELS[m.kind];
    const notice = recapTranslationNotice(picked, locale);
    return `${formatMinute(m.period, m.matchClockMs)}  ${text}${notice ? ` ${notice}` : ''}`;
  });
  const stats = statRows(recap.finalSnapshot).map((r) =>
    copy.statLine(r.label, statValue(r.home), statValue(r.away)),
  );
  return [
    copy.heading(recap.title),
    REPORT_RULE,
    copy.score(fixture.home.name, fixture.away.name, home, away),
    fixture.competitionLabel,
    '',
    copy.moments,
    ...moments,
    '',
    copy.stats,
    ...stats,
    '',
    copy.footer,
    copy.disclosure,
    '',
  ].join('\n');
};
