import type { Locale, Persona } from '@matchiq/contracts';
import { TeamSwatch } from '@/components/match/team-swatch';
import { Badge, TechnicalDetails } from '@/components/ui';
import {
  CONFIDENCE_LABELS,
  INSIGHT_KIND_LABELS,
  englishLanguageName,
  PRIORITY_LABELS,
} from '@/constants/match';
import { RECAP_COPY } from '@/constants/recap';
import { STUDIO_COPY } from '@/constants/studio';
import { SITE } from '@/constants/site';
import type { RosterTeam } from '@/features/studio/lib/roster';
import type { RecapMoment as Moment } from '@/lib/api/session-schemas';
import { formatMinute } from '@/lib/format';
import { pickNarrative } from './pick-narrative';

type RecapMomentProps = {
  moment: Moment;
  team: RosterTeam | null;
  persona: Persona;
  locale: Locale;
};

export function RecapMomentItem({
  moment,
  team,
  persona,
  locale,
}: RecapMomentProps) {
  const picked = pickNarrative(moment.narratives, persona, locale);
  const kind = INSIGHT_KIND_LABELS[moment.kind];
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className="tabular pt-0.5 font-mono text-sm font-semibold text-ink">
        {formatMinute(moment.period, moment.matchClockMs)}
      </span>
      <article
        aria-label={picked?.narrative.headline ?? kind}
        className="min-w-0"
      >
        <header className="flex flex-wrap items-center gap-2">
          <Badge tone={moment.priority === 'P0' ? 'accent' : 'neutral'}>
            {PRIORITY_LABELS[moment.priority]}
          </Badge>
          <span className="text-xs font-medium text-ink">{kind}</span>
          {team ? (
            <span className="inline-flex items-center gap-1 text-micro font-semibold text-ink-muted">
              <TeamSwatch side={team.side} className="size-2" />
              {team.shortName}
            </span>
          ) : null}
          <span className="ml-auto text-micro text-ink-subtle">
            {CONFIDENCE_LABELS[moment.confidenceLabel]}
          </span>
        </header>
        {picked ? (
          <div className="mt-1.5" lang={picked.narrative.locale}>
            <p className="text-sm font-semibold text-ink">
              {picked.narrative.headline}
            </p>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {picked.narrative.body}
            </p>
            <p
              lang={SITE.locale}
              className="mt-1 flex flex-wrap gap-x-2 text-micro text-ink-subtle"
            >
              <span>
                {STUDIO_COPY.insights.source[picked.narrative.source]}
              </span>
              {picked.fallback ? (
                <span className="text-warning" lang={SITE.locale}>
                  {RECAP_COPY.localeFallback(englishLanguageName(locale))}
                </span>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-ink-subtle">
            {RECAP_COPY.noNarrative}
          </p>
        )}
        <p className="mt-2 text-micro text-ink-subtle">
          {RECAP_COPY.evidence(moment.evidenceEventIds.length)} ·{' '}
          {RECAP_COPY.metricRefs(moment.metricRefs.length)}
        </p>
        <TechnicalDetails className="mt-2">
          <p className="break-all font-mono text-ink-muted">
            {RECAP_COPY.technical.events}: {moment.evidenceEventIds.join(', ')}
          </p>
          <p className="break-all font-mono text-ink-muted">
            {moment.metricRefs.join(', ')}
          </p>
          <p className="font-mono text-ink-muted">
            {RECAP_COPY.technical.reason}: {moment.reasonCode}
          </p>
        </TechnicalDetails>
      </article>
    </li>
  );
}
