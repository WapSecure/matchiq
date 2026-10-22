'use client';

import { PowerIcon } from '@/components/icons';
import { KILL_COPY, RELEASE_COPY } from '@/constants/editorial';
import {
  activateKillSwitch,
  releaseKillSwitch,
} from '@/lib/api/editorial-endpoints';
import { useMatchStore } from '../store';
import { CommandDialog } from './command-dialog';
import { GatedButton } from './gated-button';
import { useEditorialCommand } from './use-editorial-command';

/**
 * Organisation-wide: activation takes every live cue off air in every active
 * session, so it asks for a reason and then a typed confirmation.
 */
export function KillSwitchControl() {
  const active = useMatchStore((s) => s.editorial?.killSwitch.active ?? false);
  const applyKillSwitch = useMatchStore((s) => s.applyKillSwitch);
  const command = useEditorialCommand({
    run: active ? releaseKillSwitch : activateKillSwitch,
    apply: (result) => applyKillSwitch(result.killSwitch),
    copy: active ? RELEASE_COPY : KILL_COPY,
  });
  return (
    <>
      <GatedButton
        permission="editorial:publish"
        variant={active ? 'secondary' : 'danger'}
        aria-haspopup="dialog"
        leadingIcon={<PowerIcon size={14} />}
        onClick={command.start}
      >
        {active ? RELEASE_COPY.action : KILL_COPY.action}
      </GatedButton>
      <CommandDialog
        command={command}
        copy={active ? RELEASE_COPY : KILL_COPY}
        Icon={PowerIcon}
        tone={active ? 'default' : 'danger'}
        confirm={active ? undefined : KILL_COPY}
      />
    </>
  );
}
