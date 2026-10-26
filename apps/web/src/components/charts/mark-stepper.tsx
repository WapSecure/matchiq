import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { DEPTH_COPY } from '@/constants/pitch-depth';

type MarkStepperProps = {
  ids: readonly string[];
  activeId: string | null;
  onActivate: (id: string | null) => void;
  /** Detail for the active mark, or the hint text when nothing is chosen. */
  readout: string;
};

/** Keyboard and touch route to the details that hovering shows; read out politely. */
export function MarkStepper({
  ids,
  activeId,
  onActivate,
  readout,
}: MarkStepperProps) {
  const index = activeId === null ? -1 : ids.indexOf(activeId);
  const step = (delta: number) => {
    const count = ids.length;
    const next = index === -1 ? (delta > 0 ? 0 : count - 1) : index + delta;
    onActivate(ids[(next + count) % count] ?? null);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div
        role="group"
        aria-label={DEPTH_COPY.stepLegend}
        className="flex items-center gap-1.5"
      >
        <Button
          size="sm"
          disabled={ids.length === 0}
          leadingIcon={<ChevronLeftIcon className="size-3.5" />}
          onClick={() => step(-1)}
        >
          {DEPTH_COPY.previous}
        </Button>
        <Button size="sm" disabled={ids.length === 0} onClick={() => step(1)}>
          {DEPTH_COPY.next}
          <ChevronRightIcon className="size-3.5" />
        </Button>
        {index !== -1 ? (
          <span className="tabular font-mono text-micro text-ink-subtle">
            {DEPTH_COPY.stepPosition(index + 1, ids.length)}
          </span>
        ) : null}
      </div>
      <p
        aria-live="polite"
        className="tabular min-h-4 min-w-0 flex-1 text-xs text-ink-muted"
      >
        {readout}
      </p>
    </div>
  );
}
