type OverlayStandbyProps = {
  label: string;
  lastAired: string | null;
};

/** Clean-feed state between graphics, placed where the next cue will appear. */
export function OverlayStandby({ label, lastAired }: OverlayStandbyProps) {
  return (
    <div
      data-testid="overlay-standby"
      className="flex max-w-full items-center gap-[0.7cqw] rounded-[0.3cqw] bg-canvas/70 px-[0.9cqw] py-[0.45cqw] text-[max(9px,1.1cqw)] ring-1 ring-line"
    >
      <span
        aria-hidden
        className="size-[max(6px,0.7cqw)] shrink-0 rounded-full bg-ink-subtle"
      />
      <span className="shrink-0 font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </span>
      {lastAired ? (
        <span className="min-w-0 truncate text-ink-muted">{lastAired}</span>
      ) : null}
    </div>
  );
}
