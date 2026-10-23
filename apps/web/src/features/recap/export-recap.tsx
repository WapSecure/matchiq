'use client';

import type { Fixture } from '@matchiq/contracts';
import { ChevronDownIcon, DownloadIcon, FileIcon } from '@/components/icons';
import { ActionButton, Menu, type MenuAction } from '@/components/ui';
import {
  JSON_INDENT,
  JSON_MEDIA_TYPE,
  RECAP_COPY,
  TEXT_MEDIA_TYPE,
} from '@/constants/recap';
import { useStudioUi } from '@/features/studio/store';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { matchCodeSlug } from '@/lib/match-code';
import { useMatchLabel } from '@/lib/use-match-label';
import { buildReport } from './recap-report';

const copy = RECAP_COPY.export;

const ACTIONS: readonly MenuAction[] = [
  {
    id: 'report',
    label: copy.report.label,
    description: copy.report.description,
    icon: <FileIcon size={15} />,
  },
  {
    id: 'data',
    label: copy.data.label,
    description: copy.data.description,
    icon: <DownloadIcon size={15} />,
  },
];

const save = (body: string, type: string, filename: string): void => {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

/** One download affordance; the format is a choice, not jargon on the button. */
export function ExportRecap({
  recap,
  fixture,
  className,
}: {
  recap: RecapDocument;
  fixture: Fixture;
  className?: string;
}) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const { code } = useMatchLabel(recap.fixtureId);
  const name = code ? matchCodeSlug(code) : recap.fixtureId;
  const onAction = (id: string) => {
    if (id === 'report')
      save(
        buildReport({ recap, fixture, persona, locale }),
        TEXT_MEDIA_TYPE,
        copy.reportFile(name),
      );
    else
      save(
        JSON.stringify(recap, null, JSON_INDENT),
        JSON_MEDIA_TYPE,
        copy.dataFile(name),
      );
  };
  return (
    <div className={className}>
      <Menu
        label={copy.menuLabel}
        actions={ACTIONS}
        onAction={onAction}
        placement="bottom end"
        trigger={
          <ActionButton leadingIcon={<DownloadIcon size={14} />}>
            {copy.trigger}
            <ChevronDownIcon size={14} className="-mr-0.5 text-ink-subtle" />
          </ActionButton>
        }
      />
    </div>
  );
}
