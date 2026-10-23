import { EvidenceIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { PLAYER_FOCUS_COPY as C } from '@/constants/player-focus';
import { formatMinute } from '@/lib/format';

export type FocusMoment = {
  id: string;
  headline: string;
  period: number;
  clockMs: number;
};

/** Key moments that name the player or cite their actions. */
export function PlayerMoments({
  moments,
  onOpen,
}: {
  moments: readonly FocusMoment[];
  /** Studio only: opens the moment's evidence drawer. */
  onOpen?: (id: string) => void;
}) {
  return (
    <section aria-label={C.momentsTitle} className="flex flex-col gap-1.5">
      <h3 className="eyebrow text-ink-subtle">{C.momentsTitle}</h3>
      {moments.length === 0 ? (
        <p className="text-xs text-ink-subtle">{C.noMoments}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {moments.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs"
            >
              <span className="tabular w-10 shrink-0 font-mono text-ink-muted">
                {formatMinute(m.period, m.clockMs)}
              </span>
              <span className="min-w-0 flex-1 font-medium text-ink">
                {m.headline}
              </span>
              {onOpen ? (
                <Button
                  size="xs"
                  variant="ghost"
                  iconOnly
                  aria-label={C.openMoment(m.headline)}
                  aria-haspopup="dialog"
                  onClick={() => onOpen(m.id)}
                >
                  <EvidenceIcon size={14} />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
