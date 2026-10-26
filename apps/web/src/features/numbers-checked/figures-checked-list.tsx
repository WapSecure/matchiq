import type { Insight, Narrative } from '@matchiq/contracts';
import { useMemo } from 'react';
import { NUMBERS_CHECKED_COPY as COPY } from '@/constants/numbers-checked';
import { narrativeFigures } from './check-figures';

/** Each figure the published wording uses and the stat it matched; nothing when no claim can be made. */
export function FiguresCheckedList({
  insight,
  narrative,
}: {
  insight: Insight;
  narrative?: Narrative;
}) {
  const figures = useMemo(
    () => (narrative ? narrativeFigures(insight, narrative) : null),
    [insight, narrative],
  );
  if (!figures || figures.length === 0) return null;
  return (
    <section aria-label={COPY.listTitle} className="flex flex-col gap-1.5">
      <h3 className="eyebrow">{COPY.listTitle}</h3>
      <p className="text-xs text-ink-subtle">{COPY.line(figures.length)}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {figures.map((f) => (
          <li
            key={`${f.shown}-${f.stat}`}
            className="flex flex-wrap items-baseline gap-x-1.5"
          >
            <span className="tabular font-semibold text-ink">{f.shown}</span>
            <span className="text-ink-subtle">{COPY.matches}</span>
            <span className="text-ink-muted">{f.stat}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
