import { type InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'h-8 w-full min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-[13px] text-ink disabled:opacity-50';

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  className?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  className,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

export function TextField({
  label,
  value,
  onChange,
  hint,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={CONTROL}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-micro text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
