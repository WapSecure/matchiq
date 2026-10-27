import { Disclosure } from '@/components/ui/disclosure';
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
    <Disclosure title={label} panelClassName="pt-2 text-xs">
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className="max-h-48 overflow-auto rounded-md border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
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
    </Disclosure>
  );
}
