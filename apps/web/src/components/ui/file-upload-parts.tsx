import { AlertIcon, UploadIcon } from '@/components/icons';
import { FILE_COPY } from '@/constants/ui';
import type { FileRejection } from '@/lib/file-validation';
import { ERROR_TEXT } from './control-styles';

export function DropPrompt({
  active,
  multiple,
}: {
  active: boolean;
  multiple: boolean;
}) {
  const idle = multiple ? FILE_COPY.dropMany : FILE_COPY.drop;
  return (
    <>
      <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-panel group-data-drop-target:text-accent">
        <UploadIcon size={18} />
      </span>
      <p className="text-[13px] font-medium text-ink">
        {active ? FILE_COPY.dropActive : idle}
      </p>
      <p className="text-micro text-ink-subtle">{FILE_COPY.or}</p>
    </>
  );
}

/** Announced once per selection; each line says what to do next. */
export function FileRejections({
  rejected,
}: {
  rejected: readonly FileRejection[];
}) {
  if (rejected.length === 0) return null;
  return (
    <ul role="alert" className="flex flex-col gap-1">
      {rejected.map((r) => (
        <li key={`${r.name}-${r.reason}`} className={ERROR_TEXT}>
          <AlertIcon size={12} className="mt-0.5 shrink-0" />
          {r.reason}
        </li>
      ))}
    </ul>
  );
}
