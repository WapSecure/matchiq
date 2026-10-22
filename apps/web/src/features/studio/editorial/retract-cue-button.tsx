'use client';

import type { OverlayCue } from '@matchiq/contracts';
import { useState } from 'react';
import { RetractIcon } from '@/components/icons';
import {
  EDITORIAL_COPY,
  PRODUCER_RETRACT_REASON,
  RETRACT_COPY,
} from '@/constants/editorial';
import { retractOverlay } from '@/lib/api/editorial-endpoints';
import { useMatchStore } from '../store';
import { CommandDialog } from './command-dialog';
import { GatedButton } from './gated-button';
import { useEditorialCommand } from './use-editorial-command';

function Subject({ cue }: { cue: OverlayCue }) {
  return (
    <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-[13px]">
      <span className="eyebrow mr-2 text-ink-subtle">
        {EDITORIAL_COPY.subject}
      </span>
      <span className="font-medium text-ink">{cue.headline}</span>
    </p>
  );
}

/**
 * Pulls the cue the preview shows. The target is fixed when the dialog opens,
 * so a newer cue arriving meanwhile is never retracted by mistake. The button
 * stays mounted (inert when nothing is on air) so focus can return to it.
 */
export function RetractCueButton({ cue }: { cue: OverlayCue | null }) {
  const [target, setTarget] = useState<OverlayCue | null>(null);
  const applyRetraction = useMatchStore((s) => s.applyRetraction);
  const command = useEditorialCommand({
    run: (input) => retractOverlay(target?.overlayId ?? '', input),
    apply: (result) =>
      applyRetraction({
        overlayId: result.overlayId,
        revision: result.revision,
        reason: PRODUCER_RETRACT_REASON,
        cause: 'PRODUCER',
      }),
    copy: RETRACT_COPY,
  });
  return (
    <>
      <GatedButton
        permission="editorial:publish"
        size="xs"
        aria-haspopup="dialog"
        aria-disabled={cue ? undefined : true}
        aria-label={cue ? RETRACT_COPY.label(cue.headline) : RETRACT_COPY.idle}
        leadingIcon={<RetractIcon size={14} />}
        className={cue ? undefined : 'cursor-not-allowed opacity-60'}
        onClick={() => {
          if (!cue) return;
          setTarget(cue);
          command.start();
        }}
      >
        {RETRACT_COPY.action}
      </GatedButton>
      <CommandDialog
        command={command}
        copy={RETRACT_COPY}
        Icon={RetractIcon}
        tone="danger"
        subject={target ? <Subject cue={target} /> : null}
      />
    </>
  );
}
