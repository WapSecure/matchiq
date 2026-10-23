'use client';

import { REPLAY_SPEEDS, type ReplaySpeed } from '@matchiq/contracts';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { PauseIcon, PlayIcon, RestartIcon } from '@/components/icons';
import { Button, SegmentedControl, Tooltip } from '@/components/ui';
import { REPLAY_COPY } from '@/constants/replay';
import { useStartSession } from '@/features/lobby/use-start-session';
import { useReplayTransport } from '../hooks/use-replay-transport';
import { useSessionTemplate } from '../hooks/use-session-template';
import { useMatchStore } from '../store';
import { SeekBar } from './seek-bar';

type Transport = ReturnType<typeof useReplayTransport>;

const SPEED_OPTIONS = REPLAY_SPEEDS.map((value) => ({
  value,
  label: REPLAY_COPY.speedOption(value),
}));

function statusText(t: Transport): string {
  if (t.pending) return REPLAY_COPY.pending;
  if (t.awaiting) return REPLAY_COPY.awaiting;
  const state = t.replay
    ? REPLAY_COPY.state[t.replay.state]
    : REPLAY_COPY.unknownState;
  return `${state} · ${REPLAY_COPY.speedOption(t.speed)}`;
}

function PrimaryButton({ t, disabled }: { t: Transport; disabled: boolean }) {
  if (!t.primary) return null;
  const Icon = t.primary === 'pause' ? PauseIcon : PlayIcon;
  return (
    <Button
      variant="primary"
      onClick={t.runPrimary}
      disabled={disabled}
      leadingIcon={<Icon size={14} />}
    >
      {REPLAY_COPY[t.primary]}
    </Button>
  );
}

function ProblemLine({
  t,
  restartError,
}: {
  t: Transport;
  restartError: unknown;
}) {
  if (t.error)
    return <InlineProblem error={t.error} lead={REPLAY_COPY.failed} />;
  if (!restartError) return null;
  return (
    <InlineProblem error={restartError} lead={REPLAY_COPY.restartFailed} />
  );
}

/** Transport for one session; every state shown comes from the server. */
export function ReplayControls({ sessionId }: { sessionId: string }) {
  const t = useReplayTransport(sessionId);
  const template = useSessionTemplate(sessionId);
  const restart = useStartSession();
  const applied = useMatchStore((s) =>
    Math.max(s.lastEventSequence, s.replay?.appliedSequence ?? -1),
  );
  const busy = t.pending || restart.pending;
  const completed = t.replay?.state === 'COMPLETED';
  const locked = busy || !t.replay || completed;
  return (
    <div
      role="group"
      aria-label={REPLAY_COPY.region}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton t={t} disabled={busy} />
        <Tooltip content={REPLAY_COPY.restartHint}>
          <Button
            variant={completed ? 'primary' : 'secondary'}
            onClick={() =>
              template && restart.start(template.templateId, t.speed)
            }
            disabled={busy || !template}
            leadingIcon={<RestartIcon size={14} />}
          >
            {restart.pending ? REPLAY_COPY.restarting : REPLAY_COPY.restart}
          </Button>
        </Tooltip>
        <SegmentedControl<ReplaySpeed>
          legend={REPLAY_COPY.speed}
          hideLegend
          options={SPEED_OPTIONS}
          value={t.speed}
          onChange={t.changeSpeed}
          disabled={locked}
        />
        <p role="status" className="tabular ml-auto text-xs text-ink-muted">
          {statusText(t)}
        </p>
      </div>
      <SeekBar
        total={template?.eventCount ?? applied + 1}
        applied={applied}
        onCommit={t.seek}
        disabled={locked || !template}
      />
      <ProblemLine t={t} restartError={restart.error} />
    </div>
  );
}
