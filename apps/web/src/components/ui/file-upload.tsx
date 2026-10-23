'use client';

import { useId, useState } from 'react';
import {
  DropZone,
  type DropItem,
  FileTrigger,
  isFileDropItem,
} from 'react-aria-components';
import { FILE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  checkFiles,
  type FileRejection,
  type FileRules,
  formatBytes,
} from '@/lib/file-validation';
import { ActionButton } from './action-button';
import { HELP_TEXT, LABEL } from './control-styles';
import { FileUploadList, type UploadItem } from './file-upload-list';
import { DropPrompt, FileRejections } from './file-upload-parts';

export type FileUploadProps = FileRules & {
  label: string;
  description?: string;
  multiple?: boolean;
  isDisabled?: boolean;
  /** Files that passed validation; the parent starts the upload. */
  onFiles: (files: File[]) => void;
  items?: readonly UploadItem[];
  onRemove?: (id: string) => void;
  className?: string;
};

const filesFrom = async (items: readonly DropItem[]): Promise<File[]> =>
  Promise.all(items.filter(isFileDropItem).map((item) => item.getFile()));

/**
 * While dragging only exact MIME types can be tested; extension and wildcard
 * rules wait for the drop, where every file is checked anyway.
 */
const dropOperation = (
  types: { has: (type: string) => boolean },
  accept: readonly string[],
): 'copy' | 'cancel' => {
  if (
    accept.length === 0 ||
    accept.some((a) => a.startsWith('.') || a.endsWith('*'))
  )
    return 'copy';
  return accept.some((a) => types.has(a)) ? 'copy' : 'cancel';
};

/** Drag-and-drop or browse; type and size are checked before `onFiles` runs. */
export function FileUpload({
  label,
  description,
  multiple = false,
  isDisabled = false,
  onFiles,
  items = [],
  onRemove,
  className,
  ...rules
}: FileUploadProps) {
  const labelId = useId();
  const helpId = useId();
  const [rejected, setRejected] = useState<FileRejection[]>([]);
  const take = (files: readonly File[]) => {
    const result = checkFiles(files, {
      ...rules,
      maxFiles: multiple ? rules.maxFiles : 1,
    });
    setRejected(result.rejected);
    if (result.accepted.length > 0) onFiles(result.accepted);
  };
  const invalid = rejected.length > 0;
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span id={labelId} className={LABEL}>
        {label}
      </span>
      <DropZone
        aria-labelledby={labelId}
        aria-describedby={helpId}
        isDisabled={isDisabled}
        getDropOperation={(types) => dropOperation(types, rules.accept)}
        onDrop={async (event) => take(await filesFrom(event.items))}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-[1.5px] border-dashed bg-surface-raised px-4 py-7 text-center outline-none transition-[border-color,background-color,box-shadow] duration-200',
          'bg-[radial-gradient(120%_80%_at_50%_0%,var(--mq-accent-soft),transparent_60%)]',
          invalid ? 'border-critical' : 'border-line-strong',
          'data-hovered:border-control data-drop-target:border-solid data-drop-target:border-accent data-drop-target:bg-accent-soft data-drop-target:ring-4 data-drop-target:ring-accent/12',
          'data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent',
          'data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:bg-none data-disabled:opacity-70',
        )}
      >
        {({ isDropTarget }) => (
          <>
            <DropPrompt active={isDropTarget} multiple={multiple} />
            <FileTrigger
              acceptedFileTypes={[...rules.accept]}
              allowsMultiple={multiple}
              onSelect={(list) => take(list ? Array.from(list) : [])}
            >
              <ActionButton size="sm" isDisabled={isDisabled}>
                {multiple ? FILE_COPY.browseMany : FILE_COPY.browse}
              </ActionButton>
            </FileTrigger>
            <p id={helpId} className={HELP_TEXT}>
              {description ??
                FILE_COPY.accepts(
                  rules.acceptLabel,
                  formatBytes(rules.maxBytes),
                )}
            </p>
          </>
        )}
      </DropZone>
      <FileRejections rejected={rejected} />
      <FileUploadList items={items} onRemove={onRemove} />
    </div>
  );
}
