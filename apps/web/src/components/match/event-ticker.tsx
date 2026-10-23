import type { MatchEventType } from '@matchiq/contracts';
import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { type CardColour, EventGlyph } from './event-glyph';
import { type Side, TeamSwatch } from './team-swatch';
import { TickerFlags } from './ticker-flags';

export type TickerRow = {
  id: string;
  type: MatchEventType;
  period: number;
  minute: string;
  label: string;
  detail: string | null;
  team: { side: Side; shortName: string } | null;
  highlight: boolean;
  card: CardColour | null;
  voided: string | null;
  /** Made by the player the viewer follows. */
  followed?: boolean;
};

type EventTickerProps = {
  rows: readonly TickerRow[];
  label: string;
  voidedLabel: string;
  periodLabel: (period: number) => string;
  followedLabel?: string;
};

const RAIL: Record<CardColour, string> = {
  YELLOW: 'bg-card-yellow',
  SECOND_YELLOW: 'bg-card-yellow',
  RED: 'bg-card-red',
};

const railOf = (row: TickerRow): string | null => {
  if (row.voided) return null;
  if (row.type === 'GOAL') return 'bg-accent';
  return row.card ? RAIL[row.card] : null;
};

const itemClass = (row: TickerRow, goal: boolean): string =>
  cn(
    'relative grid grid-cols-[2.5rem_1.5rem_minmax(0,1fr)] items-start gap-x-2.5 px-4 py-2',
    goal && 'bg-accent-soft',
    row.highlight && !goal && 'bg-surface-raised/60',
    row.followed && 'ring-1 ring-inset ring-accent/50',
  );

const TickerItem = memo(function TickerItem({
  row,
  voidedLabel,
  followedLabel,
}: {
  row: TickerRow;
  voidedLabel: string;
  followedLabel?: string;
}) {
  const goal = row.type === 'GOAL' && !row.voided;
  const rail = railOf(row);
  return (
    <li
      data-event-type={row.type}
      className={itemClass(row, goal)}
      data-followed={row.followed === true}
    >
      {rail ? (
        <span
          aria-hidden
          className={cn('absolute inset-y-0 left-0 w-[3px]', rail)}
        />
      ) : null}
      <span className="tabular pt-1 text-right font-mono text-xs text-ink-muted">
        {row.minute}
      </span>
      <EventGlyph type={row.type} card={row.card} />
      <div className="min-w-0 pt-0.5">
        <p className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-ink">
          <span
            className={cn(
              goal ? 'text-sm font-semibold' : 'font-medium',
              row.voided && 'text-ink-muted line-through',
            )}
          >
            {row.label}
          </span>
          {row.team ? (
            <span className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-ink-muted">
              <TeamSwatch side={row.team.side} className="size-2" />
              {row.team.shortName}
            </span>
          ) : null}
          <TickerFlags
            row={row}
            voidedLabel={voidedLabel}
            followedLabel={followedLabel}
          />
        </p>
        {row.detail ? (
          <p className="truncate text-xs text-ink-subtle">{row.detail}</p>
        ) : null}
      </div>
    </li>
  );
});

/** Newest first, grouped by period; rows are memoised for 30x replay. */
export function EventTicker({
  rows,
  label,
  voidedLabel,
  periodLabel,
  followedLabel,
}: EventTickerProps) {
  return (
    <ol aria-label={label} className="flex flex-col pb-1">
      {rows.map((row, i) => (
        <PeriodBreak
          key={row.id}
          show={rows[i - 1]?.period !== row.period}
          label={periodLabel(row.period)}
        >
          <TickerItem
            row={row}
            voidedLabel={voidedLabel}
            followedLabel={followedLabel}
          />
        </PeriodBreak>
      ))}
    </ol>
  );
}

function PeriodBreak({
  show,
  label,
  children,
}: {
  show: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      {show ? (
        <li className="eyebrow sticky top-0 z-10 border-y border-line bg-surface/95 px-4 py-1.5 backdrop-blur-sm first:border-t-0">
          {label}
        </li>
      ) : null}
      {children}
    </>
  );
}
