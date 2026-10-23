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
      <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-accent shadow-panel transition-transform duration-200 ease-[var(--ease-broadcast)] group-data-hovered:-translate-y-0.5 group-data-drop-target:-translate-y-1 group-data-drop-target:scale-110 group-data-drop-target:border-accent/40 group-data-disabled:text-ink-subtle">
        <UploadIcon size={19} />
      </span>
      <p className="mt-1 text-sm font-semibold text-ink">
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
