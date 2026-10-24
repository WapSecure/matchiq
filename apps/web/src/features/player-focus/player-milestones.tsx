import type { PlayerMilestone } from '@matchiq/football-engine/player';
import { Badge } from '@/components/ui';
import {
  MILESTONE_LABELS,
  PLAYER_FOCUS_COPY as C,
} from '@/constants/player-focus';
import { formatMinute } from '@/lib/format';

const TONE = {
  FIRST_SHOT_ON_TARGET: 'accent',
  GOAL: 'positive',
  BOOKED: 'warning',
  SENT_OFF: 'critical',
} as const;

export function PlayerMilestones({
  milestones,
}: {
  milestones: readonly PlayerMilestone[];
}) {
  if (milestones.length === 0) return null;
  return (
    <section aria-label={C.milestonesTitle} className="flex flex-col gap-1.5">
      <h3 className="eyebrow text-ink-subtle">{C.milestonesTitle}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {milestones.map((m) => (
          <li key={`${m.kind}:${m.eventId}`}>
            <Badge tone={TONE[m.kind]}>
              <span className="tabular font-mono">
                {formatMinute(m.period, m.clockMs)}
              </span>
              {MILESTONE_LABELS[m.kind]}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
