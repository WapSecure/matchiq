import { FreezeIcon, PowerIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export type StandbyHold = 'paused' | 'stopped';

type OverlayStandbyProps = {
  label: string;
  /** An editorial hold (freeze or kill switch) rather than a gap between cues. */
  held?: boolean;
  /** Which hold; a bare `held` reads as paused. */
  hold?: StandbyHold | null;
  /** Second line while held, e.g. "New graphics are held". */
  note?: string | null;
  lastAired: string | null;
};

const HOLD_TONE: Record<StandbyHold, { ring: string; text: string }> = {
  paused: { ring: 'ring-warning/55', text: 'text-warning' },
  stopped: { ring: 'ring-critical/60', text: 'text-critical' },
};

function HeldSlate({
  label,
  hold,
  note,
  lastAired,
}: Required<Pick<OverlayStandbyProps, 'label' | 'lastAired'>> & {
  hold: StandbyHold;
  note: string | null;
}) {
  const Icon = hold === 'stopped' ? PowerIcon : FreezeIcon;
  const tone = HOLD_TONE[hold];
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-[max(22px,3.2cqw)] shrink-0 items-center justify-center rounded-full bg-white/5 ring-1',
          tone.ring,
          tone.text,
        )}
      >
        <Icon className="size-[max(12px,1.7cqw)]" />
      </span>
      <span className="flex min-w-0 flex-col gap-[0.2cqw]">
        <span
          className={cn('font-semibold uppercase tracking-[0.12em]', tone.text)}
        >
          {label}
        </span>
        <span className="min-w-0 truncate text-ink-muted">
          {[note, lastAired].filter(Boolean).join(' · ')}
        </span>
      </span>
    </>
  );
}

/** Clean-feed state between graphics, placed where the next cue will appear. */
export function OverlayStandby({
  label,
  held = false,
  hold = null,
  note = null,
  lastAired,
}: OverlayStandbyProps) {
  const active: StandbyHold | null = hold ?? (held ? 'paused' : null);
  return (
    <div
      data-testid="overlay-standby"
      data-held={active ? '' : undefined}
      data-hold={active ?? undefined}
      className={cn(
        'flex max-w-full items-center gap-[1cqw] rounded-[0.45cqw] bg-surface-sunken/85 text-[max(9px,1.15cqw)] shadow-float ring-1 backdrop-blur-sm',
        active
          ? cn('px-[1.2cqw] py-[0.8cqw]', HOLD_TONE[active].ring)
          : 'px-[1cqw] py-[0.55cqw] ring-white/10',
      )}
    >
      {active ? (
        <HeldSlate
          label={label}
          hold={active}
          note={note}
          lastAired={lastAired}
        />
      ) : (
        <>
          <span
            aria-hidden
            className="size-[max(6px,0.7cqw)] shrink-0 rounded-full border border-ink-subtle"
          />
          <span className="shrink-0 font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {label}
          </span>
          {lastAired ? (
            <>
              <span
                aria-hidden
                className="h-[1.2cqw] w-px shrink-0 bg-white/15"
              />
              <span className="min-w-0 truncate text-ink-muted">
                {lastAired}
              </span>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
