import type { AuditEvent } from '@matchiq/contracts';
import { TechnicalDetails } from '@/components/ui';
import { AUDIT_COPY } from '@/constants/audit';
import { describeReason } from '@/lib/describe-reason';

export function AuditTechnical({ event }: { event: AuditEvent }) {
  const labels = AUDIT_COPY.technical;
  const rows = [
    [labels.action, event.action],
    [
      labels.reason,
      event.reason && describeReason(event.reason) !== event.reason
        ? event.reason
        : null,
    ],
    [labels.actor, event.actor.id],
    [labels.target, event.target.id],
    [labels.entry, event.id],
    [labels.request, event.requestId],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <TechnicalDetails className="mt-2 text-left font-normal">
      <dl className="grid gap-1 font-mono text-micro">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-ink-subtle">{label}</dt>
            <dd className="break-all text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </TechnicalDetails>
  );
}
