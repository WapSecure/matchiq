'use client';

import { FreezeIcon, PlayIcon } from '@/components/icons';
import { FREEZE_COPY, RESUME_COPY } from '@/constants/editorial';
import { freezeFixture, resumeFixture } from '@/lib/api/editorial-endpoints';
import { useMatchStore } from '../store';
import { CommandDialog } from './command-dialog';
import { GatedButton } from './gated-button';
import { useEditorialCommand } from './use-editorial-command';

/** Session freeze: held cues never air, and resume releases nothing (ADR-0016). */
export function FreezeControl() {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const frozen = useMatchStore((s) => s.editorial?.freeze.active ?? false);
  const applyEditorial = useMatchStore((s) => s.applyEditorial);
  const copy = frozen ? RESUME_COPY : FREEZE_COPY;
  const Icon = frozen ? PlayIcon : FreezeIcon;
  const command = useEditorialCommand({
    run: (input) =>
      frozen
        ? resumeFixture(fixtureId, input)
        : freezeFixture(fixtureId, input),
    apply: (result) => applyEditorial(result.status, 'rest'),
    copy,
  });
  return (
    <>
      <GatedButton
        permission="editorial:publish"
        aria-haspopup="dialog"
        leadingIcon={<Icon size={14} />}
        onClick={command.start}
      >
        {copy.action}
      </GatedButton>
      <CommandDialog command={command} copy={copy} Icon={Icon} />
    </>
  );
}
