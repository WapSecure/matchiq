import { memo } from 'react';
import { cn } from '@/lib/cn';
import { type Side, TeamSwatch } from './team-swatch';

export type TickerRow = {
  id: string;
  minute: string;
  label: string;
  detail: string | null;
  team: { side: Side; shortName: string } | null;
  highlight: boolean;
  voided: string | null;
};

type EventTickerProps = {
  rows: readonly TickerRow[];
  label: string;
  voidedLabel: string;
};

const TickerItem = memo(function TickerItem({
  row,
  voidedLabel,
}: {
  row: TickerRow;
  voidedLabel: string;
}) {
  return (
    <li
      className={cn(
        'grid grid-cols-[3rem_1fr] gap-2 border-b border-line/60 px-4 py-2 last:border-0',
        row.highlight && 'bg-accent-soft',
      )}
    >
      <span className="tabular pt-px font-mono text-xs text-ink-muted">
        {row.minute}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px] text-ink">
          {row.team ? (
            <span className="inline-flex items-center gap-1 text-micro font-semibold text-ink-muted">
              <TeamSwatch side={row.team.side} className="size-2" />
              {row.team.shortName}
            </span>
          ) : null}
          <span className={cn('font-medium', row.voided && 'line-through')}>
            {row.label}
          </span>
          {row.voided ? (
            <span className="eyebrow text-warning">{voidedLabel}</span>
          ) : null}
        </p>
        {row.detail ? (
          <p className="truncate text-xs text-ink-muted">{row.detail}</p>
        ) : null}
      </div>
    </li>
  );
});

/** Newest first; rows are memoised so a 30x replay only renders new entries. */
export function EventTicker({ rows, label, voidedLabel }: EventTickerProps) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {rows.map((row) => (
        <TickerItem key={row.id} row={row} voidedLabel={voidedLabel} />
      ))}
    </ol>
  );
}
