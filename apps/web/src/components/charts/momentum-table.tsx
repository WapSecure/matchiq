import { NOT_AVAILABLE } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { formatMinute } from '@/lib/format';

export type MomentumDatum = {
  period: number;
  clockMs: number;
  home: number | null;
  away: number | null;
};

type MomentumTableProps = {
  label: string;
  homeName: string;
  awayName: string;
  data: readonly MomentumDatum[];
};

const DECIMALS = 1;

const cell = (value: number | null): string =>
  value === null ? NOT_AVAILABLE : value.toFixed(DECIMALS);

/** Text alternative for the momentum chart (WCAG 1.1.1). */
export function MomentumTable({
  label,
  homeName,
  awayName,
  data,
}: MomentumTableProps) {
  return (
    <details className="group text-xs">
      <summary className="cursor-pointer select-none text-ink-subtle hover:text-ink">
        {label}
      </summary>
      <div className="mt-2 max-h-48 overflow-auto rounded-md border border-line">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-raised text-ink-muted">
            <tr>
              <th scope="col" className="px-2 py-1 font-medium">
                {STUDIO_COPY.metrics.clock}
              </th>
              <th scope="col" className="px-2 py-1 font-medium">
                {homeName}
              </th>
              <th scope="col" className="px-2 py-1 font-medium">
                {awayName}
              </th>
            </tr>
          </thead>
          <tbody className="tabular text-ink">
            {data.map((d) => (
              <tr
                key={`${d.period}-${d.clockMs}`}
                className="border-t border-line/60"
              >
                <td className="px-2 py-1 font-mono">
                  {formatMinute(d.period, d.clockMs)}
                </td>
                <td className="px-2 py-1">{cell(d.home)}</td>
                <td className="px-2 py-1">{cell(d.away)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
