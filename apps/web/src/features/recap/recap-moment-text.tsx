import { AnalystBreakdown } from '@/components/match/analyst-breakdown';
import { RECAP_COPY } from '@/constants/recap';
import type { RecapNarrativeView } from './pick-narrative';

/** Headline, then the Analyst breakdown when there is one, or the body. */
export function RecapMomentText({
  picked,
}: {
  picked: RecapNarrativeView | null;
}) {
  if (!picked) {
    return (
      <p className="mt-1.5 text-xs text-ink-subtle">{RECAP_COPY.noNarrative}</p>
    );
  }
  const { narrative, language } = picked;
  return (
    <div className="mt-1.5" lang={language}>
      <p className="text-[15px] font-semibold leading-snug text-ink">
        {narrative.headline}
      </p>
      {narrative.breakdown ? (
        <AnalystBreakdown
          breakdown={narrative.breakdown}
          language={language}
          level={3}
          className="mt-1.5"
        />
      ) : (
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
          {narrative.body}
        </p>
      )}
    </div>
  );
}
