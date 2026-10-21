'use client';

import { DownloadIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { JSON_INDENT, JSON_MEDIA_TYPE, RECAP_COPY } from '@/constants/recap';
import type { RecapDocument } from '@/lib/api/session-schemas';

const download = (recap: RecapDocument): void => {
  const blob = new Blob([JSON.stringify(recap, null, JSON_INDENT)], {
    type: JSON_MEDIA_TYPE,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = RECAP_COPY.exportFile(recap.fixtureId);
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ExportRecap({
  recap,
  className,
}: {
  recap: RecapDocument;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      title={RECAP_COPY.exportHint}
      onClick={() => download(recap)}
      leadingIcon={<DownloadIcon size={14} />}
      className={className}
    >
      {RECAP_COPY.export}
    </Button>
  );
}
