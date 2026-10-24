import { AnalystBreakdown } from '@/components/match/analyst-breakdown';
import { RuledOutNote } from '@/components/match/ruled-out-note';
import { RECAP_COPY } from '@/constants/recap';
import type { RecapMoment as Moment } from '@/lib/api/session-schemas';
import type { pickNarrative } from './pick-narrative';

/** The chosen write-up, or a plain note when a correction ruled the moment out. */
export function RecapMomentBody({
  moment,
  picked,
}: {
  moment: Moment;
  picked: ReturnType<typeof pickNarrative>;
}) {
  if (moment.retracted) {
    return (
      <RuledOutNote
        kind={moment.kind}
        reason={moment.retracted.reason}
        className="mt-1.5"
      />
    );
  }
  if (!picked) {
    return (
      <p className="mt-1.5 text-xs text-ink-subtle">{RECAP_COPY.noNarrative}</p>
    );
  }
  return (
    <div className="mt-1.5" lang={picked.language}>
      <p className="text-[15px] font-semibold leading-snug text-ink">
        {picked.narrative.headline}
      </p>
      {picked.narrative.breakdown ? (
        <AnalystBreakdown
          breakdown={picked.narrative.breakdown}
          language={picked.language}
          level={3}
          className="mt-1.5"
        />
      ) : (
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
          {picked.narrative.body}
        </p>
      )}
    </div>
  );
}
