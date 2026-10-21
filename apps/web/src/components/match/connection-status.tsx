import { CONNECTION_COPY, STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import type { ConnectionState } from '@/lib/stream';

const TONE: Record<ConnectionState, string> = {
  connecting: 'text-ink-muted border-line-strong',
  live: 'text-positive border-positive/30 bg-positive/5',
  reconnecting: 'text-warning border-warning/30 bg-warning/5',
  stale: 'text-warning border-warning/30 bg-warning/5',
  offline: 'text-critical border-critical/30 bg-critical/5',
};

const PULSE: Partial<Record<ConnectionState, string>> = {
  live: 'motion-safe:animate-pulse',
  connecting: 'motion-safe:animate-pulse',
};

type ConnectionStatusProps = {
  state: ConnectionState;
  className?: string;
};

export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  return (
    <span
      role="status"
      data-state={state}
      className={cn(
        'eyebrow inline-flex h-6 items-center gap-1.5 rounded-sm border px-2',
        TONE[state],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full bg-current', PULSE[state])}
      />
      <span className="sr-only">{STUDIO_COPY.connectionPrefix}</span>
      {CONNECTION_COPY[state].label}
    </span>
  );
}
