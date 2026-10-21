import type { MetricValue } from '@matchiq/contracts';
import { cn } from '@/lib/cn';
import { MetricValueText } from './metric-value';
import { SIDE_BG } from './team-swatch';

export type StatRow =
  | { key: string; label: string; kind: 'count'; home: number; away: number }
  | {
      key: string;
      label: string;
      kind: 'metric';
      home: MetricValue;
      away: MetricValue;
    };

type StatComparisonProps = {
  caption: string;
  homeName: string;
  awayName: string;
  rows: readonly StatRow[];
};

const FULL = 100;

const numeric = (value: number | MetricValue): number | null => {
  if (typeof value === 'number') return value;
  return value.status === 'available' ? value.value : null;
};

const shares = (row: StatRow): [number, number] | null => {
  const home = numeric(row.home);
  const away = numeric(row.away);
  if (home === null || away === null) return null;
  const max = Math.max(home, away);
  return max === 0 ? [0, 0] : [(home / max) * FULL, (away / max) * FULL];
};

function Bars({ row }: { row: StatRow }) {
  const pair = shares(row);
  if (!pair) return null;
  return (
    <div aria-hidden className="mt-1 grid grid-cols-2 gap-1">
      <div className="flex h-1 justify-end rounded-full bg-surface-sunken">
        <span
          className={cn('rounded-full', SIDE_BG.home)}
          style={{ width: `${pair[0]}%` }}
        />
      </div>
      <div className="flex h-1 rounded-full bg-surface-sunken">
        <span
          className={cn('rounded-full', SIDE_BG.away)}
          style={{ width: `${pair[1]}%` }}
        />
      </div>
    </div>
  );
}

function Value({ row, side }: { row: StatRow; side: 'home' | 'away' }) {
  if (row.kind === 'count') {
    return <span className="tabular">{row[side]}</span>;
  }
  return <MetricValueText metric={row[side]} />;
}

export function StatComparison({
  caption,
  homeName,
  awayName,
  rows,
}: StatComparisonProps) {
  return (
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{homeName}</th>
          <th scope="col">{caption}</th>
          <th scope="col">{awayName}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line/60 last:border-0">
            <td className="w-16 py-1.5 text-left align-top font-semibold text-ink">
              <Value row={row} side="home" />
            </td>
            <th
              scope="row"
              className="py-1.5 text-center align-top text-xs font-normal text-ink-muted"
            >
              {row.label}
              <Bars row={row} />
            </th>
            <td className="w-16 py-1.5 text-right align-top font-semibold text-ink">
              <Value row={row} side="away" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
