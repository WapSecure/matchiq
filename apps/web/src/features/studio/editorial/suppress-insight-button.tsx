'use client';

import { useQueryClient } from '@tanstack/react-query';
import { SuppressIcon } from '@/components/icons';
import { SUPPRESS_COPY } from '@/constants/editorial';
import { suppressInsight } from '@/lib/api/editorial-endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { useMatchStore } from '../store';
import { CommandDialog } from './command-dialog';
import { GatedButton } from './gated-button';
import { useEditorialCommand } from './use-editorial-command';

type SuppressInsightButtonProps = { insightId: string; headline: string };

/** Stops a pending insight from publishing; the API answers 409 once it has. */
export function SuppressInsightButton({
  insightId,
  headline,
}: SuppressInsightButtonProps) {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const markSuppressed = useMatchStore((s) => s.markSuppressed);
  const queryClient = useQueryClient();
  const command = useEditorialCommand({
    run: (input) => suppressInsight(insightId, input),
    apply: () => {
      markSuppressed(insightId);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agentRuns(fixtureId),
      });
    },
    copy: SUPPRESS_COPY,
  });
  return (
    <>
      <GatedButton
        permission="editorial:approve"
        size="xs"
        variant="ghost"
        aria-haspopup="dialog"
        aria-label={SUPPRESS_COPY.label(headline)}
        leadingIcon={<SuppressIcon size={14} />}
        onClick={command.start}
      >
        {SUPPRESS_COPY.action}
      </GatedButton>
      <CommandDialog
        command={command}
        copy={SUPPRESS_COPY}
        Icon={SuppressIcon}
        tone="danger"
      />
    </>
  );
}
