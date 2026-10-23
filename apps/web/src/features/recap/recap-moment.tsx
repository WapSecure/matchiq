import type { Locale, Persona } from '@matchiq/contracts';
import { SparkIcon } from '@/components/icons';
import { SIDE_BG } from '@/components/match/team-swatch';
import { Badge } from '@/components/ui';
import {
  CONFIDENCE_LABELS,
  INSIGHT_KIND_LABELS,
  englishLanguageName,
  PRIORITY_LABELS,
} from '@/constants/match';
import { RECAP_COPY } from '@/constants/recap';
import { SITE } from '@/constants/site';
import { STUDIO_COPY } from '@/constants/studio';
import type { RosterTeam } from '@/features/studio/lib/roster';
import type { RecapMoment as Moment } from '@/lib/api/session-schemas';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';
import { pickNarrative } from './pick-narrative';
import { momentAnchor } from './recap-order';
import { RecapMomentTechnical } from './recap-moment-technical';

type RecapMomentProps = {
  moment: Moment;
  team: RosterTeam | null;
  persona: Persona;
  locale: Locale;
};

function Rail({ team, major }: { team: RosterTeam | null; major: boolean }) {
  return (
    <span aria-hidden className="relative flex justify-center">
      <span className="absolute inset-y-0 w-px bg-line group-first/moment:top-4 group-last/moment:bottom-[calc(100%-1rem)]" />
      <span
        className={cn(
          'relative mt-1.5 rounded-full ring-4 ring-surface',
          major ? 'size-3' : 'size-2.5',
          team ? SIDE_BG[team.side] : 'bg-ink-subtle',
        )}
      />
    </span>
  );
}

type Picked = ReturnType<typeof pickNarrative>;

/** Who wrote it, what backs it, and a note when the language fell back. */
function Meta({
  moment,
  picked,
  locale,
}: {
  moment: Moment;
  picked: Picked;
  locale: Locale;
}) {
  const ai = picked?.narrative.source === 'AGENT';
  return (
    <>
      <p
        lang={SITE.locale}
        className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-subtle"
      >
        {picked ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              ai ? 'text-accent-strong' : 'text-ink-muted',
            )}
          >
            {ai ? <SparkIcon size={11} /> : null}
            {STUDIO_COPY.insights.source[picked.narrative.source]}
          </span>
        ) : null}
        <span>{RECAP_COPY.evidence(moment.evidenceEventIds.length)}</span>
        <span>{RECAP_COPY.metricRefs(moment.metricRefs.length)}</span>
      </p>
      {picked?.fallback ? (
        <p lang={SITE.locale} className="mt-1 text-micro text-warning">
          {RECAP_COPY.localeFallback(englishLanguageName(locale))}
        </p>
      ) : null}
    </>
  );
}

export function RecapMomentItem({
  moment,
  team,
  persona,
  locale,
}: RecapMomentProps) {
  const picked = pickNarrative(moment.narratives, persona, locale);
  const kind = INSIGHT_KIND_LABELS[moment.kind];
  const major = moment.priority === 'P0';
  return (
    <li
      id={momentAnchor(moment.insightId)}
      className="group/moment grid scroll-mt-24 grid-cols-[2.25rem_0.75rem_minmax(0,1fr)] gap-x-2 px-3 sm:grid-cols-[3rem_1rem_minmax(0,1fr)] sm:gap-x-3 sm:px-4"
    >
      <span
        className={cn(
          'tabular pt-3 text-right font-mono text-sm font-semibold',
          major ? 'text-accent' : 'text-ink',
        )}
      >
        {formatMinute(moment.period, moment.matchClockMs)}
      </span>
      <Rail team={team} major={major} />
      <article
        aria-label={picked?.narrative.headline ?? kind}
        className="min-w-0 border-b border-line py-3 group-last/moment:border-0"
      >
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={major ? 'accent' : 'neutral'}>
            {PRIORITY_LABELS[moment.priority]}
          </Badge>
          <span className="text-xs font-medium text-ink">{kind}</span>
          {team ? (
            <span className="text-micro font-semibold text-ink-muted">
              {team.shortName}
            </span>
          ) : null}
          <span className="ml-auto text-micro text-ink-subtle">
            {CONFIDENCE_LABELS[moment.confidenceLabel]}
          </span>
        </header>
        {picked ? (
          <div className="mt-1.5" lang={picked.narrative.locale}>
            <p className="text-[15px] font-semibold leading-snug text-ink">
              {picked.narrative.headline}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
              {picked.narrative.body}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-ink-subtle">
            {RECAP_COPY.noNarrative}
          </p>
        )}
        <Meta moment={moment} picked={picked} locale={locale} />
        <RecapMomentTechnical moment={moment} />
      </article>
    </li>
  );
}
