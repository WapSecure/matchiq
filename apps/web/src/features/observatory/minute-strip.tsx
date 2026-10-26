import { SIDE_BG } from '@/components/match/team-swatch';
import { Tooltip } from '@/components/ui';
import {
  FACT_CHECKS_COPY,
  PERCENT,
  TIMELINE_MIN_SPAN,
} from '@/constants/fact-checks';
import { cn } from '@/lib/cn';
import { assignLanes } from './minute-strip-lanes';

const MS_PER_MINUTE = 60_000;

export type StripTone = 'ai' | 'standard' | 'pending' | 'home' | 'away';

export type StripMarker = {
  id: string;
  /** Match time since kick-off. */
  atMs: number;
  href: string;
  label: string;
  tone: StripTone;
  /** A larger marker, for major moments. */
  emphasis?: boolean;
  /** A warning ring, for simulated failures. */
  flagged?: boolean;
};

const TONE: Record<StripTone, string> = {
  ai: 'border-accent bg-accent',
  standard: 'border-ink-subtle bg-surface',
  pending: 'border-dashed border-line-strong bg-surface',
  home: `border-surface ${SIDE_BG.home}`,
  away: `border-surface ${SIDE_BG.away}`,
};

const left = (minute: number, span: number) =>
  `${Math.min(PERCENT, (minute / span) * PERCENT)}%`;

const dot = (m: StripMarker) =>
  cn(
    'block rounded-full border-2 shadow-panel',
    m.emphasis ? 'size-3.5' : 'size-3',
    TONE[m.tone],
    m.flagged && 'ring-2 ring-warning ring-offset-1 ring-offset-surface',
  );

function Axis({ span }: { span: number }) {
  const ticks = FACT_CHECKS_COPY.timeline.ticks.filter((t) => t.minute <= span);
  return (
    <div aria-hidden className="absolute inset-x-1.5 top-4">
      <div className="h-1 rounded-full bg-surface-sunken ring-1 ring-line" />
      {ticks.map((t) => (
        <span
          key={t.label}
          className="absolute top-3 -translate-x-1/2 font-mono text-micro tabular text-ink-subtle"
          style={{ left: left(t.minute, span) }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** Compact match timeline: one marker per moment, each a link to its card. */
export function MinuteStrip({
  markers,
  label = FACT_CHECKS_COPY.timeline.label,
  className,
}: {
  markers: readonly StripMarker[];
  label?: string;
  className?: string;
}) {
  const last = Math.max(0, ...markers.map((m) => m.atMs / MS_PER_MINUTE));
  const span = Math.max(TIMELINE_MIN_SPAN, Math.ceil(last));
  const minutes = markers.map((m) => m.atMs / MS_PER_MINUTE);
  const lanes = assignLanes(minutes, span);
  const lift = (i: number) => ({
    left: left(minutes[i] ?? 0, span),
    marginTop: `calc(${lanes[i] ?? 0} * var(--lane-step) * -1)`,
  });
  return (
    <div
      className={cn(
        'select-none [--lane-step:0.75rem] sm:[--lane-step:1.75rem]',
        className,
      )}
      style={{
        paddingTop: `calc(${Math.max(0, ...lanes)} * var(--lane-step))`,
      }}
    >
      <div className="relative h-12">
        <Axis span={span} />
        {/* Phones: markers can sit closer than a 24px target, so they are a picture only. */}
        <div aria-hidden className="absolute inset-x-1.5 top-4 sm:hidden">
          {markers.map((m, i) => (
            <span
              key={m.id}
              className={cn(
                'absolute top-0.5 -translate-x-1/2 -translate-y-1/2',
                dot(m),
              )}
              style={lift(i)}
            />
          ))}
        </div>
        <ol
          aria-label={label}
          className="absolute inset-x-1.5 top-4 hidden sm:block"
        >
          {markers.map((m, i) => (
            <li
              key={m.id}
              className="absolute top-0.5 -translate-x-1/2 -translate-y-1/2"
              style={lift(i)}
            >
              <Tooltip content={m.label}>
                <a
                  href={m.href}
                  aria-label={m.label}
                  className="group flex size-6 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span
                    className={cn(
                      'transition-transform group-hover:scale-125 motion-reduce:transition-none',
                      dot(m),
                    )}
                  />
                </a>
              </Tooltip>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
