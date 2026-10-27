import { Disclosure } from '@/components/ui/disclosure';
import { PITCH_COPY } from '@/constants/pitch';
import { EVENT_DETAIL } from '@/constants/events';
import { PLAYER_FOCUS_COPY } from '@/constants/player-focus';
import type { PitchMark } from './pitch-events';

const c = PITCH_COPY.columns;
const COLUMNS = [c.minute, c.team, c.event, c.player, c.position];

const eventLabel = (m: PitchMark): string =>
  m.outcome && m.kind === 'SHOT'
    ? `${PITCH_COPY.kind.SHOT} · ${EVENT_DETAIL.shotOutcome[m.outcome]}`
    : PITCH_COPY.kind[m.kind];

/** Text alternative for the pitch map (WCAG 1.1.1), filtered like the plot. */
export function PitchTable({ marks }: { marks: readonly PitchMark[] }) {
  return (
    <Disclosure title={PITCH_COPY.tableToggle} panelClassName="pt-2 text-xs">
      <div
        tabIndex={0}
        role="region"
        aria-label={PITCH_COPY.title}
        className="max-h-56 overflow-auto rounded-md border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <table className="w-full text-left">
          <caption className="sr-only">{PITCH_COPY.title}</caption>
          <thead className="sticky top-0 bg-surface-raised text-ink-muted">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} scope="col" className="px-2 py-1.5 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular text-ink">
            {marks.map((m) => (
              <tr key={m.id} className="border-t border-line/70">
                <td className="px-2 py-1 font-mono">{m.minute}</td>
                <td className="px-2 py-1 font-mono">{m.teamShort}</td>
                <td className="px-2 py-1">{eventLabel(m)}</td>
                <td className="px-2 py-1 text-ink-muted">
                  {m.player ?? '—'}
                  {m.followed ? (
                    <span className="ml-1.5 font-semibold text-accent-strong">
                      {PLAYER_FOCUS_COPY.followedMark}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1 font-mono">
                  {PITCH_COPY.position(m.source.x, m.source.y)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-micro text-ink-subtle">
        {PITCH_COPY.positionNote}
      </p>
    </Disclosure>
  );
}
