'use client';

import { useEffect } from 'react';
import { DeterministicIcon } from '@/components/icons';
import { ToastCard } from '@/components/ui';
import { EDITORIAL_COPY, NOTICE_DISMISS_MS } from '@/constants/editorial';
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
        <ToastCard
          key={notice.id}
          tone={notice.changed ? 'positive' : 'neutral'}
          Icon={DeterministicIcon}
          onDismiss={dismiss}
          dismissLabel={EDITORIAL_COPY.dismiss}
        >
          <p>{notice.text}</p>
        </ToastCard>
      ) : null}
    </div>
  );
}
