import type { Insight, Persona } from '@matchiq/contracts';
import { AnalystBreakdown } from '@/components/match/analyst-breakdown';
import { HintBadge } from '@/components/ui';
import { englishLanguageName, INSIGHT_KIND_LABELS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { SITE } from '@/constants/site';
import { cn } from '@/lib/cn';
import { narrativeLanguage } from '@/lib/narrative-language';
import { showSource } from '../lib/show-source';
import type { NarrativeView } from '../store';

type NarrativePanelProps = {
  insight: Insight;
  view: NarrativeView | null;
  locale: string;
  persona: Persona;
  clamp?: boolean;
  /** Heading level for the Analyst breakdown labels. */
  breakdownLevel?: 3 | 4;
};

/**
 * Narrative text for one persona and locale. Until the write-up lands, Fan and
 * Broadcast see only the kind of moment: the engine rationale carries raw
 * index values that only the Analyst persona may read.
 */
export function NarrativePanel({
  insight,
  view,
  locale,
  persona,
  clamp = false,
  breakdownLevel = 3,
}: NarrativePanelProps) {
  if (!view) {
    return (
      <div className="flex flex-col gap-1" lang={SITE.locale}>
        <p className="text-sm leading-snug text-ink">
          {persona === 'ANALYST'
            ? insight.evidence.rationale
            : INSIGHT_KIND_LABELS[insight.kind]}
        </p>
        <p className="text-xs text-ink-subtle">
          {persona === 'ANALYST'
            ? STUDIO_COPY.insights.narrativePendingAnalyst
            : STUDIO_COPY.insights.narrativePending}
        </p>
      </div>
    );
  }
  const { narrative, localeFallback } = view;
  const language = narrativeLanguage(narrative);
  return (
    <div className="flex flex-col gap-1" lang={language}>
      <p className="text-sm font-semibold leading-snug text-ink">
        {narrative.headline}
      </p>
      {narrative.breakdown ? (
        <AnalystBreakdown
          breakdown={narrative.breakdown}
          language={language}
          level={breakdownLevel}
          className="mt-1"
        />
      ) : (
        <p
          className={cn(
            'text-[13px] leading-relaxed text-ink-muted',
            clamp && 'line-clamp-2',
          )}
        >
          {narrative.body}
        </p>
      )}
      <p
        lang={SITE.locale}
        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-subtle"
      >
        {showSource(narrative.source, persona) ? (
          <HintBadge
            tone={narrative.source === 'AGENT' ? 'accent' : 'neutral'}
            dot={narrative.source === 'AGENT'}
            hint={STUDIO_COPY.insights.sourceHint[narrative.source]}
            className="normal-case"
          >
            {STUDIO_COPY.insights.source[narrative.source]}
          </HintBadge>
        ) : null}
        {localeFallback ? (
          <span className="text-warning" lang={SITE.locale}>
            {STUDIO_COPY.insights.localeFallback(englishLanguageName(locale))}
          </span>
        ) : null}
      </p>
    </div>
  );
}
