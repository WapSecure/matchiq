import { InfoIcon } from '@/components/icons';
import {
  FACT_CHECKS_COPY,
  FALLBACK_GROUP_BECAUSE,
} from '@/constants/fact-checks';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { fallbackGroups } from './moment-filters';

const copy = FACT_CHECKS_COPY.fallbackNote;

/** One note for the whole page, so a repeated reason is said once with a count. */
export function FallbackNote({ traces }: { traces: readonly InsightTrace[] }) {
  const groups = fallbackGroups(traces);
  if (groups.length === 0) return null;
  return (
    <section
      aria-label={copy.title}
      data-testid="fallback-note"
      className="flex gap-3 rounded-lg border border-line bg-surface-raised/60 px-4 py-3"
    >
      <InfoIcon size={16} className="mt-0.5 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-ink">{copy.title}</h3>
        <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-ink-muted">
          {groups.map(({ group, count }) => (
            <li key={group}>
              {copy.line(count, FALLBACK_GROUP_BECAUSE[group])}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
