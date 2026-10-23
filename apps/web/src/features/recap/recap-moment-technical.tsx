import { TechnicalDetails } from '@/components/ui';
import { RECAP_COPY } from '@/constants/recap';
import type { RecapMoment } from '@/lib/api/session-schemas';

const copy = RECAP_COPY.technical;

/** Raw evidence ids, metric refs and reason code, opt-in. */
export function RecapMomentTechnical({ moment }: { moment: RecapMoment }) {
  return (
    <TechnicalDetails className="mt-1.5">
      <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line">
        {[
          [copy.events, moment.evidenceEventIds.join(', ')],
          [copy.metrics, moment.metricRefs.join(', ')],
          [copy.reason, moment.reasonCode],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-3 py-2">
            <dt className="text-micro text-ink-subtle">{label}</dt>
            <dd className="mt-0.5 break-all font-mono text-ink-muted">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </TechnicalDetails>
  );
}
