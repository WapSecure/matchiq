import { Disclosure } from '@/components/ui/disclosure';
import { COMPARISON_COPY } from '@/constants/comparison';
import { cn } from '@/lib/cn';

type SpellTrendProps = {
  /** Accessible name, including the direction in words. */
  label: string;
  side: 'home' | 'away';
  /** Counts for the last three 5-minute spells, oldest first. */
  spells: readonly number[];
};

const BAR_WIDTH = 24;
const GAP = 10;
const HEIGHT = 40;
const MIN_BAR = 2;

/** Three bars for the latest spells, with the same numbers as a table. */
export function SpellTrend({ label, side, spells }: SpellTrendProps) {
  const peak = Math.max(1, ...spells);
  const width = spells.length * BAR_WIDTH + (spells.length - 1) * GAP;
  return (
    <div className="flex flex-col gap-1">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
        className="max-w-full"
      >
        {spells.map((count, i) => {
          const h = Math.max(MIN_BAR, (count / peak) * HEIGHT);
          return (
            <rect
              key={COMPARISON_COPY.spells[i]}
              x={i * (BAR_WIDTH + GAP)}
              y={HEIGHT - h}
              width={BAR_WIDTH}
              height={h}
              rx={3}
              className={cn(
                side === 'home' ? 'fill-home' : 'fill-away',
                i < spells.length - 1 && 'opacity-60',
              )}
            />
          );
        })}
      </svg>
      <Disclosure
        title={COMPARISON_COPY.trendTable}
        panelClassName="pt-2 text-xs"
      >
        <table className="w-full text-left">
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="px-2 py-1 font-medium">
                {COMPARISON_COPY.spellsHeader}
              </th>
              <th scope="col" className="px-2 py-1 font-medium">
                {COMPARISON_COPY.tableCount}
              </th>
            </tr>
          </thead>
          <tbody className="tabular text-ink">
            {spells.map((count, i) => (
              <tr
                key={COMPARISON_COPY.spells[i]}
                className="border-t border-line/60"
              >
                <td className="px-2 py-1">{COMPARISON_COPY.spells[i]}</td>
                <td className="px-2 py-1">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </div>
  );
}
