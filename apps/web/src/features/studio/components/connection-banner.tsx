'use client';

import { ConnectionStatus } from '@/components/match/connection-status';
import { CONNECTION_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';

export function LiveConnection() {
  const state = useMatchStore((s) => s.connection.state);
  return <ConnectionStatus state={state} />;
}

export function ConnectionBanner() {
  const state = useMatchStore((s) => s.connection.state);
  const banner = CONNECTION_COPY[state].banner;
  if (!banner) return null;
  return (
    <div
      role="status"
      className={cn(
        'border-b px-4 py-2 text-xs text-ink lg:px-6',
        state === 'offline'
          ? 'border-critical/30 bg-critical/5'
          : 'border-warning/30 bg-warning/5',
      )}
    >
      {banner}
    </div>
  );
}
