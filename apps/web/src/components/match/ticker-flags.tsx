import type { TickerRow } from './event-ticker';

/** Status words after a ticker row's label; each shows only when it applies. */
export function TickerFlags({
  row,
  voidedLabel,
  followedLabel,
}: {
  row: Pick<TickerRow, 'voided' | 'followed'>;
  voidedLabel: string;
  followedLabel?: string;
}) {
  return (
    <>
      {row.voided ? (
        <span className="eyebrow text-warning">{voidedLabel}</span>
      ) : null}
      {row.followed && followedLabel ? (
        <span className="eyebrow text-accent-strong">{followedLabel}</span>
      ) : null}
    </>
  );
}
