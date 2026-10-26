import { InfoIcon } from '@/components/icons';
import { RECORDED_NOTE_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';

/** Said once per page when any wording came from a recorded model run. */
export function RecordedNote({ traces }: { traces: readonly InsightTrace[] }) {
  const recorded = traces.some((t) =>
    t.runs.some((r) => r.provider === 'recorded'),
  );
  if (!recorded) return null;
  return (
    <section
      aria-label={RECORDED_NOTE_COPY.title}
      data-testid="recorded-note"
      className="flex gap-3 rounded-lg border border-line bg-surface-raised/60 px-4 py-3"
    >
      <InfoIcon size={16} className="mt-0.5 shrink-0 text-ink-subtle" />
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-ink">
          {RECORDED_NOTE_COPY.title}
        </h3>
        <p className="mt-1 text-[13px] text-ink-muted">
          {RECORDED_NOTE_COPY.body}.
        </p>
      </div>
    </section>
  );
}
