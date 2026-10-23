'use client';

import { ProgressBar } from 'react-aria-components';
import { AlertIcon, CheckIcon, CloseIcon, FileIcon } from '@/components/icons';
import { FILE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { formatBytes } from '@/lib/file-validation';
import { ActionButton } from './action-button';

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  /** 0–100; null while the size of the work is unknown. */
  progress: number | null;
  status: 'uploading' | 'done' | 'error';
  error?: string;
};

const STATUS_TEXT = {
  uploading: FILE_COPY.uploading,
  done: FILE_COPY.done,
  error: FILE_COPY.failed,
} as const;

function Row({
  item,
  onRemove,
}: {
  item: UploadItem;
  onRemove?: (id: string) => void;
}) {
  const failed = item.status === 'error';
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-md border bg-surface p-2.5',
        failed ? 'border-critical/50' : 'border-line',
      )}
    >
      <FileIcon size={18} className="mt-0.5 shrink-0 text-ink-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className="truncate font-medium text-ink">{item.name}</span>
          <span className="tabular shrink-0 text-micro text-ink-subtle">
            {formatBytes(item.size)}
          </span>
        </div>
        {item.status === 'uploading' ? (
          <ProgressBar
            aria-label={FILE_COPY.progress(item.name)}
            value={item.progress ?? undefined}
            isIndeterminate={item.progress === null}
            className="flex flex-col gap-1"
          >
            {({ percentage, valueText, isIndeterminate }) => (
              <>
                <span className="relative h-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span
                    className={cn(
                      'absolute inset-y-0 start-0 rounded-full bg-accent transition-[width] duration-200',
                      isIndeterminate &&
                        'w-2/5 motion-safe:animate-[progress-sweep_1.2s_ease-in-out_infinite]',
                    )}
                    style={
                      isIndeterminate ? undefined : { width: `${percentage}%` }
                    }
                  />
                </span>
                <span className="tabular text-micro text-ink-subtle">
                  {isIndeterminate ? STATUS_TEXT.uploading : valueText}
                </span>
              </>
            )}
          </ProgressBar>
        ) : (
          <p
            className={cn(
              'flex items-center gap-1 text-micro',
              failed ? 'font-medium text-critical' : 'text-positive',
            )}
          >
            {failed ? <AlertIcon size={12} /> : <CheckIcon size={12} />}
            {failed ? (item.error ?? STATUS_TEXT.error) : STATUS_TEXT.done}
          </p>
        )}
      </div>
      {onRemove ? (
        <ActionButton
          iconOnly
          size="xs"
          variant="ghost"
          aria-label={FILE_COPY.remove(item.name)}
          onPress={() => onRemove(item.id)}
          leadingIcon={<CloseIcon size={14} />}
        />
      ) : null}
    </li>
  );
}

export function FileUploadList({
  items,
  onRemove,
}: {
  items: readonly UploadItem[];
  onRemove?: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <Row key={item.id} item={item} onRemove={onRemove} />
      ))}
    </ul>
  );
}
