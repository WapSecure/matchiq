import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { TraceFact } from './trace-facts';

const VALUE_TONE: Record<NonNullable<TraceFact['tone']>, string> = {
  ai: 'text-accent-strong',
  standard: 'text-ink',
  warning: 'text-warning',
  muted: 'text-ink-subtle',
};

const DOT_TONE: Partial<Record<NonNullable<TraceFact['tone']>, string>> = {
  ai: 'bg-accent',
  standard: 'bg-ink-subtle/60',
  warning: 'bg-warning',
};

function Value({ fact }: { fact: TraceFact }) {
  const text = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium',
        VALUE_TONE[fact.tone ?? 'standard'],
      )}
    >
      {fact.tone && DOT_TONE[fact.tone] ? (
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', DOT_TONE[fact.tone])}
        />
      ) : null}
      {fact.value}
    </span>
  );
  if (!fact.tip) return text;
  return (
    <Tooltip content={fact.tip}>
      <button
        type="button"
        className="cursor-help rounded-sm text-left underline decoration-line-strong decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:outline-2 focus-visible:outline-accent"
      >
        {text}
        <span className="sr-only">: {fact.tip}</span>
      </button>
    </Tooltip>
  );
}

/** Labelled facts for one moment: commentary and graphic kept apart. */
export function TraceFactsRow({
  facts,
  label,
}: {
  facts: readonly TraceFact[];
  label: string;
}) {
  return (
    <dl
      aria-label={label}
      data-testid="trace-story"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none [&>div:last-child:nth-child(odd)]:col-span-2 sm:[&>div:last-child:nth-child(odd)]:col-span-1"
    >
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 bg-surface px-3 py-2">
          <dt className="text-micro text-ink-subtle">{fact.label}</dt>
          <dd className="mt-0.5">
            <Value fact={fact} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
