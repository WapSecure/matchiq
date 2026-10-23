import type { AuditEvent } from '@matchiq/contracts';
import {
  ACTOR_TYPE_LABELS,
  AUDIT_ACTION_LABELS,
  AUDIT_COPY,
  TARGET_TYPE_LABELS,
} from '@/constants/audit';
import { TechnicalDetails } from '@/components/ui';
import { formatRelative, formatTimestamp } from '@/lib/format-time';
import { AuditDiff } from './audit-diff';

type AuditTableProps = {
  events: readonly AuditEvent[];
  hasMore: boolean;
  nowMs: number;
};

const columns = AUDIT_COPY.columns;
const CELL = 'px-3 py-2.5 align-top';

/** The person's name first, then who they are; raw ids live in Technical details. */
function AuditActorCell({ event }: { event: AuditEvent }) {
  const type = ACTOR_TYPE_LABELS[event.actor.type];
  const name = event.actorDisplayName;
  return (
    <>
      <span className="block text-ink">{name ?? type}</span>
      {name ? (
        <span className="block text-micro text-ink-subtle">{type}</span>
      ) : null}
    </>
  );
}

function AuditTechnical({ event }: { event: AuditEvent }) {
  const t = AUDIT_COPY.technical;
  return (
    <TechnicalDetails className="mt-1.5 font-normal">
      <dl className="grid gap-1 font-mono text-micro">
        {[
          [t.action, event.action],
          [t.actor, event.actor.id],
          [t.target, event.target.id],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-ink-subtle">{label}</dt>
            <dd className="break-all text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </TechnicalDetails>
  );
}

function AuditRow({ event, nowMs }: { event: AuditEvent; nowMs: number }) {
  return (
    <tr className="border-t border-line">
      <td className={CELL}>
        <time dateTime={event.at} className="block whitespace-nowrap text-ink">
          {formatRelative(event.at, nowMs)}
        </time>
        <span className="tabular block whitespace-nowrap font-mono text-micro text-ink-subtle">
          {formatTimestamp(event.at)}
        </span>
      </td>
      <th scope="row" className={`${CELL} text-left font-medium text-ink`}>
        {AUDIT_ACTION_LABELS[event.action] ?? event.action}
      </th>
      <td className={CELL}>
        <AuditActorCell event={event} />
      </td>
      <td className={CELL}>
        <span className="block text-ink">
          {TARGET_TYPE_LABELS[event.target.type]}
        </span>
      </td>
      <td className={`${CELL} max-w-[22rem] text-ink`}>
        {event.reason ?? (
          <span className="text-ink-subtle">{AUDIT_COPY.noReason}</span>
        )}
      </td>
      <td className={CELL}>
        <AuditDiff event={event} />
        <AuditTechnical event={event} />
      </td>
    </tr>
  );
}

/** A real table; it scrolls inside its own focusable region on narrow screens. */
export function AuditTable({ events, hasMore, nowMs }: AuditTableProps) {
  return (
    <div
      role="region"
      aria-label={AUDIT_COPY.scrollRegion}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line bg-surface shadow-panel"
    >
      <table className="w-full min-w-[56rem] border-collapse text-left text-xs">
        <caption className="sr-only">
          {AUDIT_COPY.tableCaption(events.length, hasMore)}
        </caption>
        <thead className="bg-surface-raised text-ink-muted">
          <tr>
            {Object.values(columns).map((label) => (
              <th key={label} scope="col" className="eyebrow px-3 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <AuditRow key={event.id} event={event} nowMs={nowMs} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
