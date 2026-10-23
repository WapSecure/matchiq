import type { Insight } from '@matchiq/contracts';
import { languageName } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import type { NarrativeView } from '../store';

type NarrativePanelProps = {
  insight: Insight;
  view: NarrativeView | null;
  locale: string;
  clamp?: boolean;
};

/** Narrative text for one persona and locale; falls back to engine facts only. */
export function NarrativePanel({
  insight,
  view,
  locale,
  clamp = false,
}: NarrativePanelProps) {
  if (!view) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-snug text-ink">
          {insight.evidence.rationale}
        </p>
        <p className="text-xs text-ink-subtle">
          {STUDIO_COPY.insights.narrativePending}
        </p>
      </div>
    );
  }
  const { narrative, localeFallback } = view;
  return (
    <div className="flex flex-col gap-1" lang={narrative.locale}>
      <p className="text-sm font-semibold leading-snug text-ink">
        {narrative.headline}
      </p>
      <p
        className={cn(
          'text-[13px] leading-relaxed text-ink-muted',
          clamp && 'line-clamp-2',
        )}
      >
        {narrative.body}
      </p>
      <p className="flex flex-wrap gap-x-2 text-micro text-ink-subtle">
        <span>{STUDIO_COPY.insights.source[narrative.source]}</span>
        {localeFallback ? (
          <span className="text-warning" lang="en-GB">
            {STUDIO_COPY.insights.localeFallback(languageName(locale))}
          </span>
        ) : null}
      </p>
    </div>
  );
}
