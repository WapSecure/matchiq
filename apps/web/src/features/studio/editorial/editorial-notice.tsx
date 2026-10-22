'use client';

import { useEffect } from 'react';
import { CloseIcon, DeterministicIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { EDITORIAL_COPY, NOTICE_DISMISS_MS } from '@/constants/editorial';
import { cn } from '@/lib/cn';
import { useEditorialNotice } from './notice-store';

/** Polite live region for command outcomes, including `changed: false` no-ops. */
export function EditorialNotice() {
  const notice = useEditorialNotice((s) => s.notice);
  const dismiss = useEditorialNotice((s) => s.dismiss);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(dismiss, NOTICE_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  return (
    <div
      role="status"
      aria-label={EDITORIAL_COPY.noticeRegion}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center sm:inset-x-auto sm:right-6"
    >
      {notice ? (
        <div
          key={notice.id}
          className={cn(
            'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border bg-surface py-2 pl-3 pr-1.5 text-[13px] text-ink shadow-float',
            notice.changed ? 'border-positive/40' : 'border-line-strong',
          )}
        >
          <DeterministicIcon
            size={16}
            className={cn(
              'shrink-0',
              notice.changed ? 'text-positive' : 'text-ink-subtle',
            )}
          />
          <p className="min-w-0 flex-1">{notice.text}</p>
          <Button
            iconOnly
            size="xs"
            variant="ghost"
            aria-label={EDITORIAL_COPY.dismiss}
            onClick={dismiss}
            leadingIcon={<CloseIcon size={14} />}
          />
        </div>
      ) : null}
    </div>
  );
}
