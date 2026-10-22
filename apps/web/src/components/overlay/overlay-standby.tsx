type OverlayStandbyProps = {
  label: string;
  lastAired: string | null;
};

/** Clean-feed state between graphics, placed where the next cue will appear. */
export function OverlayStandby({ label, lastAired }: OverlayStandbyProps) {
  return (
    <div
      data-testid="overlay-standby"
      className="flex max-w-full items-center gap-[0.8cqw] rounded-[0.35cqw] bg-surface-sunken/75 px-[1cqw] py-[0.5cqw] text-[max(9px,1.15cqw)] ring-1 ring-white/10 backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="size-[max(6px,0.7cqw)] shrink-0 rounded-full border border-ink-subtle"
      />
      <span className="shrink-0 font-semibold uppercase tracking-[0.12em] text-ink-muted">
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
