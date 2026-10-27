import { Disclosure } from '@/components/ui/disclosure';
import { PITCH_COPY } from '@/constants/pitch';

export type DepthRow = { id: string; cells: readonly string[] };

type DepthTableProps = {
  caption: string;
  columns: readonly string[];
  rows: readonly DepthRow[];
  note?: string;
};

/** Text alternative for the shot and pass maps (WCAG 1.1.1): the same rows as the plot. */
export function DepthTable({ caption, columns, rows, note }: DepthTableProps) {
  return (
    <Disclosure title={PITCH_COPY.tableToggle} panelClassName="pt-2 text-xs">
      <div
        tabIndex={0}
        role="region"
        aria-label={caption}
        className="max-h-56 overflow-auto rounded-md border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-raised text-ink-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className="px-2 py-1.5 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular text-ink">
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line/70">
                {row.cells.map((cell, i) => (
                  <td
                    key={columns[i]}
                    className={i === 0 ? 'px-2 py-1 font-mono' : 'px-2 py-1'}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? (
        <p className="mt-1.5 text-micro text-ink-subtle">{note}</p>
      ) : null}
    </Disclosure>
  );
}
