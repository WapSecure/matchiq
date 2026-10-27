import type { AuditEvent } from '@matchiq/contracts';
import type { ReactNode } from 'react';
import {
  ACTOR_TYPE_LABELS,
  AUDIT_ACTION_LABELS,
  AUDIT_COPY,
} from '@/constants/audit';
import { describeAction, describeReason } from '@/lib/describe-reason';
import { formatRelative, formatTimestamp } from '@/lib/format-time';
import type { InterfaceLocale } from '@/features/interface-language/interface-locales';
import { AuditDiff } from './audit-diff';
import { AuditTargetCell } from './audit-target-cell';
import { AuditTechnical } from './audit-technical';

type AuditTableProps = {
  events: readonly AuditEvent[];
  hasMore: boolean;
  nowMs: number;
  locale: InterfaceLocale;
};

const columns = AUDIT_COPY.columns;
const CELL = 'px-3 py-3 align-top';
/** Below md each row is a card; the column name comes from `data-label`. */
const CARD_CELL =
  'max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:p-0 max-md:before:shrink-0 max-md:before:text-xs max-md:before:text-ink-subtle max-md:before:content-[attr(data-label)]';

function Cell({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td data-label={label} className={`${CELL} ${CARD_CELL} ${className}`}>
      <div className="max-md:text-right">{children}</div>
    </td>
  );
}

/** The person's name first, then who they are; raw ids live in Technical details. */
function AuditActorCell({ event }: { event: AuditEvent }) {
  const type = ACTOR_TYPE_LABELS[event.actor.type];
  const name = event.actorDisplayName;
  return (
    <>
      <span className="block font-medium text-ink">{name ?? type}</span>
      {name ? (
        <span className="block text-micro text-ink-subtle">{type}</span>
      ) : null}
    </>
  );
}

function AuditRow({
  event,
  nowMs,
  locale,
}: {
  event: AuditEvent;
  nowMs: number;
  locale: InterfaceLocale;
}) {
  return (
    <tr className="border-t border-line max-md:flex max-md:flex-col max-md:gap-2.5 max-md:px-4 max-md:py-3.5">
      <Cell label={columns.time}>
        <time dateTime={event.at} className="block whitespace-nowrap text-ink">
          {formatRelative(event.at, nowMs, 'long', locale)}
        </time>
        <span className="tabular block whitespace-nowrap font-mono text-micro text-ink-subtle">
          {formatTimestamp(event.at, locale)}
        </span>
      </Cell>
      <th
        scope="row"
        className={`${CELL} text-left text-[13px] font-semibold text-ink max-md:order-first max-md:p-0`}
      >
        {describeAction(event.action, AUDIT_ACTION_LABELS)}
      </th>
      <Cell label={columns.actor}>
        <AuditActorCell event={event} />
      </Cell>
      <Cell label={columns.target}>
        <AuditTargetCell target={event.target} />
      </Cell>
      <Cell label={columns.reason} className="md:max-w-[22rem]">
        {event.reason ? (
          <span className="text-ink">{describeReason(event.reason)}</span>
        ) : (
          <span className="text-ink-subtle">{AUDIT_COPY.noReason}</span>
        )}
      </Cell>
      <Cell label={columns.changes}>
        <AuditDiff event={event} />
        <AuditTechnical event={event} />
      </Cell>
    </tr>
  );
}

/** A real table on wide screens; each row stacks into a card on phones. */
export function AuditTable({
  events,
  hasMore,
  nowMs,
  locale,
}: AuditTableProps) {
  return (
    <div
      role="region"
      aria-label={AUDIT_COPY.scrollRegion}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line bg-surface shadow-panel"
    >
      <table className="w-full border-collapse text-left text-xs max-md:block md:min-w-[56rem]">
        <caption className="sr-only">
          {AUDIT_COPY.tableCaption(events.length, hasMore)}
        </caption>
        <thead className="bg-surface-raised text-ink-muted max-md:sr-only">
          <tr>
            {Object.values(columns).map((label) => (
              <th
                key={label}
                scope="col"
                className="px-3 py-2.5 text-xs font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {events.map((event) => (
            <AuditRow
              key={event.id}
              event={event}
              nowMs={nowMs}
              locale={locale}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
