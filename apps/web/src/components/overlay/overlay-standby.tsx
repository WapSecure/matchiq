import { cn } from '@/lib/cn';

type OverlayStandbyProps = {
  label: string;
  /** An editorial hold (freeze or kill switch) rather than a gap between cues. */
  held?: boolean;
  lastAired: string | null;
};

/** Clean-feed state between graphics, placed where the next cue will appear. */
export function OverlayStandby({
  label,
  held = false,
  lastAired,
}: OverlayStandbyProps) {
  return (
    <div
      data-testid="overlay-standby"
      data-held={held ? '' : undefined}
      className={cn(
        'flex max-w-full items-center gap-[0.8cqw] rounded-[0.35cqw] bg-surface-sunken/75 px-[1cqw] py-[0.5cqw] text-[max(9px,1.15cqw)] ring-1 backdrop-blur-sm',
        held ? 'ring-warning/50' : 'ring-white/10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-[max(6px,0.7cqw)] shrink-0 rounded-full border',
          held ? 'border-warning bg-warning' : 'border-ink-subtle',
        )}
      />
      <span
        className={cn(
          'shrink-0 font-semibold uppercase tracking-[0.12em]',
          held ? 'text-warning' : 'text-ink-muted',
        )}
      >
        {label}
      </span>
      {lastAired ? (
        <>
          <span aria-hidden className="h-[1.2cqw] w-px shrink-0 bg-white/15" />
          <span className="min-w-0 truncate text-ink-muted">{lastAired}</span>
        </>
      ) : null}
    </div>
  );
}
